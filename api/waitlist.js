/**
 * POST /api/waitlist
 *
 * Runs on Vercel as a serverless function. Exists so that provider keys stay
 * in environment variables instead of shipping to every visitor in config.js,
 * and so validation happens somewhere a bot can't skip.
 *
 * Configure ONE of these in Vercel → Settings → Environment Variables:
 *   WAITLIST_WEBHOOK_URL   any endpoint taking a JSON POST
 *                          (Google Apps Script /exec, Zapier, n8n, your own API)
 *   WEB3FORMS_KEY          a Web3Forms access key — submissions arrive by email
 *
 * With neither set the route runs in preview mode: it validates and logs,
 * returns success, and stores nothing. Good for demos, not for launch.
 */

const STYLES = ['Warm Minimalist', 'Modern Classic', 'Industrial Loft', 'Traditional Indian'];

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
const isIndianPhone = (v) => /^[6-9]\d{9}$/.test(String(v).replace(/[\s\-()]/g, '').replace(/^\+?91/, ''));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const { name, contact, style, city, company } = body;

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
    submittedAt: new Date().toISOString(),
    // Useful for spotting bot floods from one address. Not stored anywhere else.
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  };

  try {
    if (process.env.WAITLIST_WEBHOOK_URL) {
      await forward(process.env.WAITLIST_WEBHOOK_URL, lead);
    } else if (process.env.WEB3FORMS_KEY) {
      await forward('https://api.web3forms.com/submit', {
        ...lead,
        access_key: process.env.WEB3FORMS_KEY,
        subject: `New One Interiors waitlist signup — ${lead.name}`
      });
    } else {
      console.warn('[waitlist] No provider configured. Lead not stored:', lead);
      return res.status(200).json({ ok: true, mode: 'preview' });
    }
  } catch (err) {
    // The visitor already saw their room start furnishing. Don't lose the lead
    // silently — log it so it's recoverable from the function logs.
    console.error('[waitlist] Provider failed. Lead was:', JSON.stringify(lead), err);
    return res.status(502).json({ error: 'Could not reach the waitlist provider' });
  }

  return res.status(200).json({ ok: true });
}

async function forward(url, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error(`Provider responded ${r.status}`);
  } finally {
    clearTimeout(timer);
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
