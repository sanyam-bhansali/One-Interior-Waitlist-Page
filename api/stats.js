/**
 * GET /api/stats — how many have joined (null below a hundred: "3 people have
 * joined" does more harm than no number), the launch mark, and free calls
 * left. Cached at the edge for a minute; the page reads it on every visit.
 */
import { hintFor, upstream, upstreamConfig } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!upstreamConfig()) {
    return res.status(200).json({
      ok: true, mode: 'preview',
      stats: { total: null, launchAt: 2000, freeCallsLeft: 1000 },
    });
  }
  try {
    const out = await upstream('/stats', { method: 'GET' });
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, stats: out && out.stats });
  } catch (err) {
    console.error('[stats] failed:', String(err), '→', hintFor(err && err.status));
    return res.status(503).json({ error: 'Unavailable' });
  }
}
