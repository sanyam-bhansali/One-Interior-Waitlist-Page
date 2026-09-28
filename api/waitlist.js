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

const STYLES = ['Warm Minimalist', 'Modern Classic', 'Industrial Loft', 'Traditional Indian'];

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

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const { name, contact, style, city, company, via } = body;

  // Honeypot. Bots fill hidden fields; people don't. Answer 200 so they
  // don't learn they were caught and retry with it blank.
  if (company) return res.status(200).json({ ok: true });

  const errors = [];
  if (!name || String(name).trim().length < 2) errors.push('name');
  if (!contact || !(isEmail(String(contact).trim()) || isIndianPhone(contact))) errors.push('contact');
  if (style && !STYLES.includes(style)) errors.push('style');
  if (errors.length) return res.status(400).json({ error: 'Invalid submission', fields: errors });

  const lead = {
    name: String(name).trim().slice(0, 120),
    contact: String(contact).trim().slice(0, 160),
    style: style || '',
    city: city || 'Pune',
    source: 'waitlist-landing',
    // Which society group / share link this lead came in through, if any.
    // Re-sanitised here: never trust a value that arrived from the browser.
    via: via ? String(via).toLowerCase().replace(/[^a-z0-9 _-]/g, '').slice(0, 48) : '',
    submittedAt: new Date().toISOString()
  };

  /* Trimmed, and this is not a nicety. The product side trims the value it
     reads from its own environment, so a token pasted into Vercel with a
     trailing newline or space — which is what copying out of a terminal
     usually gives you — arrives here a character longer than the one it is
     compared against, fails on length, and comes back 401. Two projects
     disagreeing about whitespace in the same secret is unfindable from the
     outside: the endpoint simply says "Not for you." */
  const ingestUrl = (process.env.ONE_INTERIORS_INGEST_URL || '').trim();
  const ingestToken = (process.env.WAITLIST_INGEST_TOKEN || '').trim();
  const hasIngest = !!(ingestUrl && ingestToken);
  const hasWebhook = !!process.env.WAITLIST_WEBHOOK_URL;
  const hasWeb3 = !!process.env.WEB3FORMS_KEY;

  if (!hasIngest && !hasWebhook && !hasWeb3) {
    console.warn('[waitlist] No destination configured. Lead not stored:', redact(lead));
    return res.status(200).json({ ok: true, mode: 'preview' });
  }

  // ---- 1 · store ------------------------------------------------------
  if (hasIngest) {
    try {
      await post(ingestUrl, lead, { Authorization: `Bearer ${ingestToken}` });
    } catch (err) {
      // The visitor has already watched their room furnish itself. Don't lose
      // the lead silently — log the whole thing so it is recoverable by hand
      // from the Vercel function logs.
      console.error('[waitlist] Ingest failed. Lead was:',
        JSON.stringify(redact(lead)), String(err));
      /* The upstream status goes in the response. It is not sensitive — a
         number, no body — and without it the only way to tell a token
         mismatch (401) from a missing table (500) from a wrong URL (404) is
         to go and read the function log, which is a poor way to spend the
         ten minutes after launching. The page shows its own wording; this is
         for whoever is holding curl. */
      return res.status(502).json({
        error: 'Could not reach the waitlist store',
        upstream: err && err.status ? err.status : null,
        hint: err && err.status === 401 ? 'token mismatch, or the product was not redeployed after setting it'
            : err && err.status === 404 ? 'wrong ONE_INTERIORS_INGEST_URL'
            : err && err.status === 500 ? 'product reached, but it could not store — table missing? run npm run db:deploy'
            : 'could not reach the product at all'
      });
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

  return res.status(200).json({ ok: true });
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

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
