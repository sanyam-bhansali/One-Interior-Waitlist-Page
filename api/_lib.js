import { createHash } from 'node:crypto';

/**
 * Shared by the functions in api/. The leading underscore keeps Vercel from
 * deploying this file as a route of its own.
 *
 * Everything here talks to the product (ops.oneinteriors.in) with the one
 * bearer token this page holds. The routes on the product side are:
 *
 *   POST {ingest}          a signup          -> { ok, created, code, status }
 *   POST {ingest}/status   { code }          -> { ok?, ...status }
 *   POST {ingest}/extras   { code, ... }     -> { ok, status }
 *   GET  {ingest}/stats                      -> { ok, stats }
 *
 * where {ingest} is ONE_INTERIORS_INGEST_URL (…/api/waitlist).
 */

/* Trimmed, and this is not a nicety. The product side trims the value it
   reads from its own environment, so a token pasted into Vercel with a
   trailing newline — which is what copying out of a terminal usually gives
   you — arrives a character longer than the one it is compared against and
   comes back 401. */
export function upstreamConfig() {
  const url = (process.env.ONE_INTERIORS_INGEST_URL || '').trim().replace(/\/+$/, '');
  const token = (process.env.WAITLIST_INGEST_TOKEN || '').trim();
  return url && token ? { url, token } : null;
}

/** Calls the product. Throws an Error carrying `.status` on a non-2xx. */
export async function upstream(path, { method = 'POST', body } = {}) {
  const cfg = upstreamConfig();
  if (!cfg) {
    const e = new Error('not configured');
    e.status = 0;
    throw e;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(cfg.url + path, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${cfg.token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await r.text().catch(() => '');
    const json = safeParse(text);
    if (!r.ok) {
      const e = new Error(`Responded ${r.status}: ${text.slice(0, 200)}`);
      e.status = r.status;
      e.body = json;
      throw e;
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/** What to look at when the product refuses — for the function log only. */
export function hintFor(status) {
  return status === 401 ? 'token mismatch, or the product was not redeployed after setting it'
    : status === 404 ? 'wrong ONE_INTERIORS_INGEST_URL (or an unknown code)'
    : status === 500 ? 'product reached, but it could not store — table missing? run npm run db:deploy'
    : status === 0 ? 'ONE_INTERIORS_INGEST_URL / WAITLIST_INGEST_TOKEN not set'
    : 'could not reach the product at all';
}

/**
 * A best-effort limit per IP, per warm instance. Vercel runs several
 * instances and recycles them, so this stops a loop from one machine rather
 * than a determined attacker — Turnstile (below) is the real gate when it is
 * switched on. Returns true when the caller should be refused.
 */
const hits = new Map();
export function limited(req, bucket, max, windowMs = 10 * 60 * 1000) {
  const ip = clientIp(req);
  const key = bucket + ':' + ip;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) {
    // Keep memory bounded on a long-lived instance.
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
  }
  return list.length > max;
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || String(req.headers['x-real-ip'] || '') || 'unknown';
}

/**
 * Cloudflare Turnstile, when TURNSTILE_SECRET_KEY is set (and the site key is
 * set in config.js). Without the secret the check is skipped entirely, so the
 * page works before an account exists.
 */
export async function turnstileOk(req, token) {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim();
  if (!secret) return true;
  if (!token || typeof token !== 'string') return false;
  try {
    const form = new URLSearchParams({ secret, response: token, remoteip: clientIp(req) });
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const j = await r.json();
    return !!(j && j.success);
  } catch {
    // Cloudflare unreachable: let the signup through rather than lose it.
    return true;
  }
}

export function readBody(req) {
  return typeof req.body === 'string' ? safeParse(req.body) || {} : req.body || {};
}

/** Same alphabet as the product: no 0/O or 1/I. */
export function cleanCode(v) {
  const c = String(v == null ? '' : v).trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{7}$/.test(c) ? c : null;
}

export function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

/* ---- Meta Conversions API ------------------------------------------------
 * The server's half of the Lead event (the browser's half is public/meta.js).
 * Sent only when META_PIXEL_ID and META_CAPI_TOKEN are set AND the visitor
 * allowed analytics on the banner — signing up is consent to be contacted,
 * not to be measured for ads, and the two are kept apart.
 *
 * Phone and email are hashed (SHA-256, normalised as Meta asks) before they
 * leave this function; Meta never receives them in the clear. Best effort:
 * never throws, never delays the visitor by more than the timeout.
 */
const sha = (v) => createHash('sha256').update(v).digest('hex');

function cookie(req, name) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Indian mobile to Meta's form: country code, digits only (919876543210). */
function metaPhone(contact) {
  const d = String(contact || '').replace(/\D/g, '');
  const ten = d.length === 10 ? d
    : d.length === 11 && d.startsWith('0') ? d.slice(1)
    : d.length === 12 && d.startsWith('91') ? d.slice(2)
    : d.length === 13 && d.startsWith('091') ? d.slice(3)
    : null;
  return ten && /^[6-9]/.test(ten) ? '91' + ten : null;
}

export async function sendMetaLead(req, { contact, name, eventId, city }) {
  const pixel = (process.env.META_PIXEL_ID || '').replace(/\D/g, '');
  const token = (process.env.META_CAPI_TOKEN || '').trim();
  if (!pixel || !token || !eventId) return { sent: false, reason: 'not configured' };

  const c = String(contact || '').trim();
  const email = /@/.test(c) ? c.toLowerCase() : null;
  const phone = email ? null : metaPhone(c);
  const first = String(name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-zऀ-ॿ]/g, '');
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined;

  const user_data = {
    ...(phone ? { ph: [sha(phone)] } : {}),
    ...(email ? { em: [sha(email)] } : {}),
    ...(first ? { fn: [sha(first)] } : {}),
    ct: [sha(String(city || 'pune').toLowerCase().replace(/[^a-z]/g, ''))],
    country: [sha('in')],
    client_ip_address: ip,
    client_user_agent: String(req.headers['user-agent'] || '') || undefined,
    fbp: cookie(req, '_fbp'),
    fbc: cookie(req, '_fbc'),
  };

  const body = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(eventId).slice(0, 100),
      action_source: 'website',
      event_source_url: String(req.headers.referer || 'https://oneinteriors.in/'),
      user_data,
      custom_data: { content_name: 'pune_waitlist' },
    }],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE.trim() } : {}),
  };

  const version = (process.env.META_GRAPH_VERSION || 'v22.0').trim();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`https://graph.facebook.com/${version}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      // The body names the problem (bad token, bad pixel) and holds no personal data.
      console.error('[meta] CAPI refused:', r.status, (await r.text().catch(() => '')).slice(0, 300));
      return { sent: false, reason: 'refused' };
    }
    return { sent: true };
  } catch (err) {
    console.error('[meta] CAPI unreachable:', String(err));
    return { sent: false, reason: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
