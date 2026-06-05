import { Router } from 'express';
import { getLeaderboard, getGlobalStats } from '../db/wings.js';

const router = Router();

// GET /api/leaderboard?limit=10
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const data = await getLeaderboard(limit);
    res.json({ data });
  } catch (err) {
    console.error('[api] leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getGlobalStats();
    res.json(stats);
  } catch (err) {
    console.error('[api] stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/health — used by Render keep-alive ping
router.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

export default router;
