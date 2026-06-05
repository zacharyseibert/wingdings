import { Router } from 'express';
import { getLeaderboard, getGlobalStats, getBiggestSession, getMostActiveDay, getLongestStreak, getRecentActivity, getWingsOverTime } from '../db/wings.js';

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

// GET /api/fun-stats — biggest session, most active day, longest streak
router.get('/fun-stats', async (_req, res) => {
  try {
    const [biggestSession, mostActiveDay, longestStreak] = await Promise.all([
      getBiggestSession(),
      getMostActiveDay(),
      getLongestStreak(),
    ]);
    res.json({ biggestSession, mostActiveDay, longestStreak });
  } catch (err) {
    console.error('[api] fun-stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/recent — last N wing entries across all users
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);
    const data = await getRecentActivity(limit);
    res.json({ data });
  } catch (err) {
    console.error('[api] recent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wings-over-time — cumulative wings per day for chart
router.get('/wings-over-time', async (_req, res) => {
  try {
    const data = await getWingsOverTime();
    res.json({ data });
  } catch (err) {
    console.error('[api] wings-over-time error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/health — used by Render keep-alive ping
router.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

export default router;
