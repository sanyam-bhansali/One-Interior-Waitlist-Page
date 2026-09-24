/**
 * POST /api/waitlist
 *
 * Runs on Vercel as a serverless function. Exists so that provider keys stay
 * in environment variables instead of shipping to every visitor in config.js,
 * and so validation happens somewhere a bot can't skip.
 *
 * ---- Storage -------------------------------------------------------------
 * Set these in Vercel → Settings → Environment Variables:
 *
 *   SUPABASE_URL                https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   the service_role key, NOT the anon key
 *
 * The service_role key bypasses row-level security, which is exactly why it
 * must never reach a browser. It lives here and in Vercel and nowhere else.
 * See docs/WAITLIST-STORAGE.md, and run supabase/schema.sql once first.
 *
 * ---- Notification (optional, on top of storage) ---------------------------
 *   WAITLIST_WEBHOOK_URL   any endpoint taking a JSON POST (Zapier, n8n, …)
 *   WEB3FORMS_KEY          a Web3Forms access key — submissions arrive by email
 *
 * Precedence: if Supabase is configured it is the store of record, and a
 * webhook becomes a best-effort ping — a lead already safely in the database
 * must not be reported as failed just because Zapier was down. If Supabase is
 * NOT configured, the webhook is the store and its failure does fail the
 * request. With none of them set the route runs in preview mode: it validates
 * and logs, returns success, and stores nothing. Good for demos, not launch.
 */

const STYLES = ['Warm Minimalist', 'Modern Classic', 'Industrial Loft', 'Traditional Indian'];

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
const isIndianPhone = (v) => /^[6-9]\d{9}$/.test(digitsOf(v));

function digitsOf(v) {
  return String(v).replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
}

/**
 * The same person typing "9822011234", "+91 98220 11234" and "+919822011234"
 * is one lead, not three. The normalised form is what carries the unique
 * index in Postgres, so a repeat signup updates their row instead of
 * quietly duplicating it — and the count you report to anyone is real.
 */
function normaliseContact(raw) {
  const s = String(raw).trim();
  if (isEmail(s)) return { kind: 'email', norm: s.toLowerCase() };
  return { kind: 'phone', norm: '+91' + digitsOf(s) };
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

  const { kind, norm } = normaliseContact(contact);

  const lead = {
    name: String(name).trim().slice(0, 120),
    contact: String(contact).trim().slice(0, 160),
    contact_kind: kind,
    contact_norm: norm,
    style: style || '',
    city: city || 'Pune',
    source: 'waitlist-landing',
    // Which society group / share link this lead came in through, if any.
    // Re-sanitised here: never trust a value that arrived from the browser.
    via: via ? String(via).toLowerCase().replace(/[^a-z0-9 _-]/g, '').slice(0, 48) : '',
    // Useful for spotting bot floods from one address. Under the DPDP Act
    // this is personal data like any other column — see the privacy note in
    // docs/WAITLIST-STORAGE.md if you would rather not keep it.
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64),
    user_agent: String(req.headers['user-agent'] || '').slice(0, 300)
  };

  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasWebhook = !!process.env.WAITLIST_WEBHOOK_URL;
  const hasWeb3 = !!process.env.WEB3FORMS_KEY;

  if (!hasSupabase && !hasWebhook && !hasWeb3) {
    console.warn('[waitlist] No provider configured. Lead not stored:', redact(lead));
    return res.status(200).json({ ok: true, mode: 'preview' });
  }

  // ---- 1 · store -----------------------------------------------------
  if (hasSupabase) {
    try {
      await storeInSupabase(lead);
    } catch (err) {
      // The visitor has already watched their room furnish itself. Don't lose
      // the lead silently — log the whole thing so it is recoverable by hand
      // from the function logs.
      console.error('[waitlist] Supabase insert failed. Lead was:',
        JSON.stringify(redact(lead)), String(err));
      return res.status(502).json({ error: 'Could not reach the waitlist store' });
    }
  }

  // ---- 2 · notify ----------------------------------------------------
  const notify = hasWebhook
    ? forward(process.env.WAITLIST_WEBHOOK_URL, toFlat(lead))
    : hasWeb3
      ? forward('https://api.web3forms.com/submit', {
          ...toFlat(lead),
          access_key: process.env.WEB3FORMS_KEY,
          subject: `New One Interiors waitlist signup — ${lead.name}`
        })
      : null;

  if (notify) {
    try {
      await notify;
    } catch (err) {
      if (!hasSupabase) {
        // Nothing stored it. This one really did fail.
        console.error('[waitlist] Provider failed. Lead was:',
          JSON.stringify(redact(lead)), String(err));
        return res.status(502).json({ error: 'Could not reach the waitlist provider' });
      }
      // Already in the database. A dead webhook is an ops problem, not the
      // visitor's — telling them it failed would make them submit again.
      console.error('[waitlist] Stored, but notification failed:', String(err));
    }
  }

  return res.status(200).json({ ok: true });
}

/**
 * Upsert on contact_norm. `resolution=merge-duplicates` turns a repeat
 * signup into an update of the existing row, so the newest name/style/via
 * wins and the row count stays equal to the number of real people.
 * created_at is deliberately not sent, so it keeps the FIRST time they joined.
 */
async function storeInSupabase(lead) {
  const base = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = `${base}/rest/v1/waitlist?on_conflict=contact_norm`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,resolution=merge-duplicates'
      },
      body: JSON.stringify([{ ...lead, updated_at: new Date().toISOString() }]),
      signal: ctrl.signal
    });
    if (!r.ok) {
      // PostgREST puts the real reason in the body; without it a 404 here is
      // indistinguishable from "table missing" and "URL wrong".
      const detail = await r.text().catch(() => '');
      throw new Error(`Supabase responded ${r.status}: ${detail.slice(0, 300)}`);
    }
  } finally {
    clearTimeout(timer);
  }
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

/** The shape older webhooks and the email template already expect. */
function toFlat(lead) {
  return {
    name: lead.name,
    contact: lead.contact,
    style: lead.style,
    city: lead.city,
    source: lead.source,
    via: lead.via,
    submittedAt: new Date().toISOString(),
    ip: lead.ip
  };
}

/** Logs go to a dashboard other people can open. Keep the contact partial. */
function redact(lead) {
  const c = String(lead.contact || '');
  return { ...lead, contact: c.slice(0, 3) + '…' + c.slice(-2), contact_norm: undefined };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
