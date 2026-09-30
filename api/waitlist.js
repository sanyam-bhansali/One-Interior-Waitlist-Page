/**
 * POST /api/waitlist
 *
 * Runs on Vercel as a serverless function. Exists so that credentials stay in
 * environment variables instead of shipping to every visitor in config.js,
 * and so validation happens somewhere a bot can't skip.
 *
 * ---- Where signups go ----------------------------------------------------
 * Into the One Interiors product database, through its own ingest route, so
 * that ops sees the waitlist beside everything else at /ops/waitlist.
 *
 *   ONE_INTERIORS_INGEST_URL   https://ops.oneinteriors.in/api/waitlist
 *                              NOT oneinteriors.in — that host is this very
 *                              page, and pointing at it makes this function
 *                              POST to itself.
 *   WAITLIST_INGEST_TOKEN      the same secret set in the product project
 *
 * This page holds a bearer token, NOT a database credential, and the
 * difference is the whole design. A Supabase service_role key would let this
 * marketing page read every user, brief and quote in the product; a token
 * scoped to one route lets it add a name to one table. If it leaks, that is
 * the entire blast radius.
 *
 * ---- Notification (optional, on top of storage) ---------------------------
 *   WAITLIST_WEBHOOK_URL   any endpoint taking a JSON POST (Zapier, n8n, …)
 *   WEB3FORMS_KEY          a Web3Forms access key — submissions arrive by email
 *
 * Precedence: if the ingest URL is configured it is the store of record, and a
 * webhook is a best-effort ping — a lead already safely in Postgres must not be
 * reported as failed because Zapier was down, or the visitor submits again and
 * you hold the same person twice. With no ingest URL, the notifier IS the store
 * and its failure does fail the request. With none of them set the route runs
 * in preview mode: it validates and logs, returns success, and stores nothing.
 */

import { cleanCode, hintFor, limited, readBody, sendMetaLead, turnstileOk, upstream, upstreamConfig } from './_lib.js';

const STYLES = ['Warm Minimalist', 'Modern Classic', 'Industrial Loft', 'Traditional Indian'];
/** The only city this page signs people up for. Anything else is a forged request. */
const CITIES = ['Pune'];

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);

/**
 * Kept deliberately identical to normalisePhone() in the product repo
 * (src/modules/studio/phone.ts), which records what a narrower version of this
 * rule already cost: `09876543210` is one of the two commonest ways an Indian
 * writes a mobile — the habit is left over from STD dialling and it is on a
 * great many business cards — and rejecting it told people typing their own
 * number correctly that it was wrong.
 *
 * Dropping ONE zero and re-testing is deliberately narrow: `020 2567 8900` is
 * also eleven digits with a leading zero, and it is a Pune landline. It strips
 * to 2025678900, fails the 6-9 rule, and is still refused — rightly, because
 * nothing can send a message to it.
 */
function isIndianPhone(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  if (d.length === 10 && /^[6-9]/.test(d)) return true;
  if (d.length === 11 && d.startsWith('0') && /^[6-9]/.test(d.slice(1))) return true;
  if (d.length === 12 && d.startsWith('91') && /^[6-9]/.test(d.slice(2))) return true;
  if (d.length === 13 && d.startsWith('091') && /^[6-9]/.test(d.slice(3))) return true;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Ten signups from one address in ten minutes is a family at most; beyond
  // that it is a loop.
  if (limited(req, 'join', 10)) return res.status(429).json({ error: 'Too many attempts' });

  const body = readBody(req);
  const { name, contact, style, city, company, via, consent, ref, turnstile, eventId, adConsent } = body;

  // Honeypot. Bots fill hidden fields; people don't. Answer 200 so they
  // don't learn they were caught and retry with it blank.
  if (company) return res.status(200).json({ ok: true, code: null, status: null });

  if (!(await turnstileOk(req, turnstile))) {
    return res.status(400).json({ error: 'Invalid submission', fields: ['turnstile'] });
  }

  const errors = [];
  if (!name || String(name).trim().length < 2) errors.push('name');
  if (!contact || !(isEmail(String(contact).trim()) || isIndianPhone(contact))) errors.push('contact');
  if (style && !STYLES.includes(style)) errors.push('style');
  if (city && !CITIES.includes(city)) errors.push('city');
  // The product refuses a signup without it too; checking here saves a trip.
  if (consent !== true) errors.push('consent');
  if (errors.length) return res.status(400).json({ error: 'Invalid submission', fields: errors });

  const lead = {
    name: String(name).trim().slice(0, 120),
    contact: String(contact).trim().slice(0, 160),
    style: style || '',
    city: city || 'Pune',
    source: 'waitlist-landing',
    consent: true,
    // The friend whose link brought them, if any.
    ref: cleanCode(ref),
    // Which society group / share link this lead came in through, if any.
    // Re-sanitised here: never trust a value that arrived from the browser.
    via: via ? String(via).toLowerCase().replace(/[^a-z0-9 _-]/g, '').slice(0, 48) : '',
    submittedAt: new Date().toISOString()
  };

  // The token is trimmed in _lib.js — see the note there.
  const hasIngest = !!upstreamConfig();
  const hasWebhook = !!process.env.WAITLIST_WEBHOOK_URL;
  const hasWeb3 = !!process.env.WEB3FORMS_KEY;

  if (!hasIngest && !hasWebhook && !hasWeb3) {
    console.warn('[waitlist] No destination configured. Lead not stored:', redact(lead));
    return res.status(200).json({ ok: true, mode: 'preview', code: null, status: null });
  }

  // ---- 1 · store ------------------------------------------------------
  let stored = null;
  if (hasIngest) {
    try {
      stored = await upstream('', { body: lead });
    } catch (err) {
      // The visitor has already watched their room light up. Don't lose the
      // lead silently — log the whole thing so it is recoverable by hand
      // from the Vercel function logs, with what to check. The response
      // carries no hint any more: which of token, URL or table is wrong is
      // for whoever reads the log, not for anyone holding curl.
      console.error('[waitlist] Ingest failed. Lead was:',
        JSON.stringify(redact(lead)), String(err), '->', hintFor(err && err.status));
      if (err && err.status === 400) {
        return res.status(400).json({
          error: 'Invalid submission',
          fields: (err.body && err.body.fields) || []
        });
      }
      return res.status(502).json({ error: 'Could not reach the waitlist store' });
    }
  }

  // ---- 2 · notify -----------------------------------------------------
  const notifyUrl = hasWebhook ? process.env.WAITLIST_WEBHOOK_URL
    : hasWeb3 ? 'https://api.web3forms.com/submit' : null;
  const notifyBody = hasWebhook ? lead : {
    ...lead,
    access_key: process.env.WEB3FORMS_KEY,
    subject: `New One Interiors waitlist signup — ${lead.name}`
  };

  if (notifyUrl) {
    try {
      await post(notifyUrl, notifyBody);
    } catch (err) {
      if (!hasIngest) {
        console.error('[waitlist] Provider failed. Lead was:',
          JSON.stringify(redact(lead)), String(err));
        return res.status(502).json({ error: 'Could not reach the waitlist provider' });
      }
      // Already stored. A dead webhook is an ops problem, not the visitor's.
      console.error('[waitlist] Stored, but notification failed:', String(err));
    }
  }

  // ---- 3 · measure (Meta Conversions API) ------------------------------
  // Only with the banner's "Allow", and only for a new signup — someone
  // joining again is not a new lead. Awaited (Vercel stops the function when
  // it responds) but capped at four seconds and never fails the signup.
  const isNew = stored ? stored.created !== false : true;
  if (adConsent === true && isNew && typeof eventId === 'string') {
    await sendMetaLead(req, { contact: lead.contact, name: lead.name, eventId, city: lead.city });
  }

  // Their code, place and unlocks, for the confirmation screen.
  return res.status(200).json({
    ok: true,
    code: (stored && stored.code) || null,
    status: (stored && stored.status) || null
  });
}

async function post(url, payload, extraHeaders = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...extraHeaders },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    if (!r.ok) {
      // Carry the reason through: without it a 401 here is indistinguishable
      // from a 404, and "check your token" is very different advice from
      // "check your URL".
      const detail = await r.text().catch(() => '');
      const e = new Error(`Responded ${r.status}: ${detail.slice(0, 200)}`);
      e.status = r.status;
      throw e;
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Logs go to a dashboard other people can open. Keep the contact partial. */
function redact(lead) {
  const c = String(lead.contact || '');
  return { ...lead, contact: `${c.slice(0, 3)}…${c.slice(-2)}` };
}
