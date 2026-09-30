/**
 * POST /api/status { code } — a returning member's place, referrals and
 * unlocks, fresh from the product. The code is the only key: it is on their
 * own link, and it reveals their first name and place, nothing else.
 */
import { cleanCode, hintFor, limited, readBody, upstream, upstreamConfig } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Codes are 32^7; a limit per IP keeps anyone from walking through them.
  if (limited(req, 'status', 30)) return res.status(429).json({ error: 'Too many attempts' });
  const code = cleanCode(readBody(req).code);
  if (!code) return res.status(400).json({ error: 'Bad code' });
  if (!upstreamConfig()) return res.status(200).json({ ok: true, mode: 'preview', status: null });
  try {
    const out = await upstream('/status', { body: { code } });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, status: (out && out.status) || null });
  } catch (err) {
    if (err && err.status === 404) return res.status(404).json({ error: 'Unknown code' });
    console.error('[status] failed:', String(err), '→', hintFor(err && err.status));
    return res.status(502).json({ error: 'Unavailable' });
  }
}
