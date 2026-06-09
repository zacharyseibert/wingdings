import { Router } from 'express';
import { getLeaderboard, getGlobalStats, getBiggestSession, getMostActiveDay, getLongestStreak, getRecentActivity, getWingsOverTime, addWings, getUser } from '../db/wings.js';
import { sendWingNotification } from '../push.js';
import { checkAndAwardBadges, getUserBadges, getRecentBadgesForUsers } from '../db/badges.js';
import { supabase } from '../db/client.js';
import { announceBadgesToSlack } from '../slack/announce.js';
import { joinCompetition, leaveCompetition, getCompetition } from '../db/competitions.js';

const router = Router();

// GET /api/leaderboard?limit=10&competitionId=123
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const competitionId = req.query.competitionId ? parseInt(req.query.competitionId, 10) : null;
    const data = await getLeaderboard(limit, competitionId);
    res.json({ data });
  } catch (err) {
    console.error('[api] leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats?competitionId=1
router.get('/stats', async (req, res) => {
  try {
    const competitionId = req.query.competitionId ? parseInt(req.query.competitionId, 10) : null;
    const stats = await getGlobalStats(competitionId);
    res.json(stats);
  } catch (err) {
    console.error('[api] stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fun-stats?competitionId=1 — biggest session, most active day, longest streak
router.get('/fun-stats', async (req, res) => {
  try {
    const competitionId = req.query.competitionId ? parseInt(req.query.competitionId, 10) : null;
    const [biggestSession, mostActiveDay, longestStreak] = await Promise.all([
      getBiggestSession(competitionId),
      getMostActiveDay(competitionId),
      getLongestStreak(competitionId),
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

// POST /api/mobile/log — log wings from mobile app (JWT auth)
router.post('/mobile/log', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Find the user record linked to this auth ID
    const { data: profile } = await supabase
      .from('users')
      .select('id, display_name, username')
      .eq('auth_id', user.id)
      .single();

    if (!profile) return res.status(404).json({ error: 'User profile not found' });

    const { amount, photoUrl, locationName, note, localHour } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    await addWings(profile.id, amount, note ?? null, photoUrl ?? null, locationName ?? null);
    const updated = await getUser(profile.id);

    // Award badges (fast now with optimized queries)
    const newBadges = await checkAndAwardBadges(profile.id, {
      amount,
      totalWings: updated.total_wings,
      photoUrl: photoUrl ?? null,
      locationName: locationName ?? null,
      loggedAt: new Date().toISOString(),
      localHour: localHour ?? new Date().getHours(),
    });

    res.json({ total_wings: updated.total_wings, newBadges });

    // Announce badges to Slack (non-blocking)
    if (newBadges.length > 0) {
      announceBadgesToSlack(
        profile.id,
        profile.display_name || profile.username,
        newBadges
      ).catch(console.error);
    }

    sendWingNotification({
      loggerUserId: profile.id,
      loggerName: profile.display_name || profile.username,
      amount,
    }).catch(console.error);
  } catch (err) {
    console.error('[api] mobile/log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mobile/stats — get stats for authenticated user
router.get('/mobile/stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) return res.status(404).json({ error: 'User profile not found' });

    const [userRes, historyRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', profile.id).single(),
      supabase.from('wing_entries')
        .select('amount, created_at, photo_url, location_name, note')
        .eq('user_id', profile.id)
        .gt('amount', 0)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Get competition info if user is in one
    let competition = null;
    if (userRes.data?.competition_id) {
      competition = await getCompetition(userRes.data.competition_id);
    }

    res.json({ user: userRes.data, history: historyRes.data ?? [], competition });
  } catch (err) {
    console.error('[api] mobile/stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mobile/token — register push token
router.post('/mobile/token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ error: 'Missing pushToken' });

    await supabase
      .from('users')
      .update({ push_token: pushToken })
      .eq('auth_id', user.id);

    res.json({ ok: true });
  } catch (err) {
    console.error('[api] mobile/token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/badges/:userId — get all badges for a user
router.get('/badges/:userId', async (req, res) => {
  try {
    const data = await getUserBadges(req.params.userId);
    res.json({ data });
  } catch (err) {
    console.error('[api] badges error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/badges/recent — get recent badges for multiple users
router.post('/badges/recent', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds required' });
    const data = await getRecentBadgesForUsers(userIds);
    res.json({ data });
  } catch (err) {
    console.error('[api] badges/recent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mobile/competition/join — join a competition with code
router.post('/mobile/competition/join', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) return res.status(404).json({ error: 'User profile not found' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const competition = await joinCompetition(profile.id, code.toUpperCase().trim());
    res.json({ competition });
  } catch (err) {
    console.error('[api] mobile/competition/join error:', err);
    if (err.message === 'Invalid competition code') {
      return res.status(404).json({ error: 'Invalid competition code' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mobile/competition/leave — leave current competition
router.post('/mobile/competition/leave', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) return res.status(404).json({ error: 'User profile not found' });

    await leaveCompetition(profile.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[api] mobile/competition/leave error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/health — used by Render keep-alive ping
router.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

export default router;
