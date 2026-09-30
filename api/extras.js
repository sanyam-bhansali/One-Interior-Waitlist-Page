/**
 * POST /api/extras { code, possession, bhk, society, style } — the optional
 * questions after joining ("skip 20 places"). The product cleans every value
 * and grants the places once; this only passes it through.
 */
import { cleanCode, hintFor, limited, readBody, upstream, upstreamConfig } from './_lib.js';

const POSSESSION = ['HAVE_KEYS', 'WITHIN_3_MONTHS', 'LATER'];
const BHKS = ['1', '2', '3', '4+'];
const STYLES = ['Warm Minimalist', 'Modern Classic', 'Industrial Loft', 'Traditional Indian'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (limited(req, 'extras', 20)) return res.status(429).json({ error: 'Too many attempts' });
  const b = readBody(req);
  const code = cleanCode(b.code);
  if (!code) return res.status(400).json({ error: 'Bad code' });
  const society = typeof b.society === 'string'
    ? b.society.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
    : '';
  const payload = {
    code,
    possession: POSSESSION.includes(b.possession) ? b.possession : null,
    bhk: BHKS.includes(b.bhk) ? b.bhk : null,
    society: society || null,
    style: STYLES.includes(b.style) ? b.style : null,
  };
  if (!upstreamConfig()) return res.status(200).json({ ok: true, mode: 'preview', status: null });
  try {
    const out = await upstream('/extras', { body: payload });
    return res.status(200).json({ ok: true, status: (out && out.status) || null });
  } catch (err) {
    if (err && err.status === 404) return res.status(404).json({ error: 'Unknown code' });
    console.error('[extras] failed:', String(err), '→', hintFor(err && err.status));
    return res.status(502).json({ error: 'Unavailable' });
  }
}
