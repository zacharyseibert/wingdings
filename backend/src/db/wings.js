import { supabase } from './client.js';

/**
 * Upsert a Slack user record (create if not exists, update name/avatar if changed).
 */
export async function upsertUser({ id, username, display_name, avatar_url, email }) {
  // Check if a mobile-only user exists with this email — if so, merge them in
  if (email) {
    const { data: mobUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .like('id', 'mob_%')
      .maybeSingle();

    if (mobUser) {
      // First upsert the Slack user so the FK exists
      await supabase.from('users').upsert(
        { id, username, display_name, avatar_url, email },
        { onConflict: 'id', ignoreDuplicates: false }
      );
      // Move wing entries from mob user to Slack user
      await supabase
        .from('wing_entries')
        .update({ user_id: id })
        .eq('user_id', mobUser.id);
      // Delete the now-empty mob user
      await supabase.from('users').delete().eq('id', mobUser.id);
      // Recompute total for the Slack user (trigger only fires on insert, so do it manually)
      const { data: entries } = await supabase
        .from('wing_entries')
        .select('amount')
        .eq('user_id', id);
      const total = (entries ?? []).reduce((sum, e) => sum + e.amount, 0);
      await supabase.from('users').update({ total_wings: total }).eq('id', id);
      return;
    }
  }

  const { error } = await supabase
    .from('users')
    .upsert(
      { id, username, display_name, avatar_url, ...(email ? { email } : {}) },
      { onConflict: 'id', ignoreDuplicates: false }
    );
  if (error) throw error;
}

/**
 * Add (or subtract, if amount is negative) wings for a user.
 * Ensures the total never goes below 0.
 */
export async function addWings(userId, amount, note = null, photoUrl = null, locationName = null, latitude = null, longitude = null, rating = null) {
  // Guard: fetch current total to prevent going negative
  const user = await getUser(userId);
  if (user && user.total_wings + amount < 0) {
    throw new RangeError(`You only have ${user.total_wings} wings — can't remove ${Math.abs(amount)}.`);
  }

  const { data, error } = await supabase
    .from('wing_entries')
    .insert({
      user_id: userId,
      amount,
      note,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
      ...(locationName ? { location_name: locationName } : {}),
      ...(latitude != null ? { latitude } : {}),
      ...(longitude != null ? { longitude } : {}),
      ...(rating != null ? { rating } : {}),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Set a user's total wings to an absolute value (admin command).
 * Inserts a corrective entry = target - current.
 */
export async function setWings(userId, target) {
  const user = await getUser(userId);
  const current = user?.total_wings ?? 0;
  const delta = target - current;
  if (delta === 0) return;

  const { error } = await supabase
    .from('wing_entries')
    .insert({ user_id: userId, amount: delta, note: 'admin set' });
  if (error) throw error;
}

export async function getUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

export async function getLeaderboard(limit = 10, competitionId = null) {
  let query = supabase
    .from('users')
    .select('id, display_name, username, avatar_url, total_wings, updated_at, competition_id')
    .gt('total_wings', 0);

  // Filter by competition if specified
  if (competitionId !== null) {
    query = query.eq('competition_id', competitionId);
  }

  const { data, error } = await query
    .order('total_wings', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getHistory(userId, limit = 10) {
  const { data, error } = await supabase
    .from('wing_entries')
    .select('amount, note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getGlobalStats(competitionId = null) {
  let query = supabase.from('users').select('total_wings, competition_id');

  if (competitionId !== null) {
    query = query.eq('competition_id', competitionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  const total = data.reduce((sum, u) => sum + u.total_wings, 0);
  const participants = competitionId !== null ? data.length : data.filter(u => u.total_wings > 0).length;
  return { total, participants };
}

export async function getBiggestSession(competitionId = null) {
  const { data, error } = await supabase
    .from('wing_entries')
    .select('amount, created_at, user_id, users(display_name, username, avatar_url, competition_id)')
    .gt('amount', 0)
    .order('amount', { ascending: false })
    .limit(competitionId !== null ? 100 : 1);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Filter by competition if needed
  const filtered = competitionId !== null
    ? data.filter(e => e.users?.competition_id === competitionId)
    : data;

  return filtered[0] || null;
}

export async function getMostActiveDay(competitionId = null) {
  let query = supabase
    .from('wing_entries')
    .select('created_at, amount, users(competition_id)')
    .gt('amount', 0);

  const { data, error } = await query;
  if (error) throw error;

  // Filter by competition if needed
  const filtered = competitionId !== null
    ? data.filter(e => e.users?.competition_id === competitionId)
    : data;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const totals = Array(7).fill(0);
  for (const e of filtered) {
    totals[new Date(e.created_at).getDay()] += e.amount;
  }
  const max = Math.max(...totals);
  if (max === 0) return null;
  return { day: days[totals.indexOf(max)], total: max };
}

export async function getLongestStreak(competitionId = null) {
  let query = supabase
    .from('wing_entries')
    .select('user_id, created_at, users(display_name, username, competition_id)')
    .gt('amount', 0)
    .order('created_at', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  // Filter by competition if needed
  const filtered = competitionId !== null
    ? data.filter(e => e.users?.competition_id === competitionId)
    : data;

  // Group dates by user
  const byUser = {};
  for (const e of filtered) {
    const uid = e.user_id;
    const date = new Date(e.created_at).toISOString().slice(0, 10);
    if (!byUser[uid]) byUser[uid] = { name: e.users?.display_name || e.users?.username, dates: new Set() };
    byUser[uid].dates.add(date);
  }

  let best = { name: null, streak: 0 };
  for (const [, { name, dates }] of Object.entries(byUser)) {
    const sorted = Array.from(dates).sort();
    let streak = 1, max = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
      if (streak > max) max = streak;
    }
    if (max > best.streak) best = { name, streak: max };
  }
  return best.streak > 0 ? best : null;
}

const ACTIVITY_SELECT = 'id, amount, created_at, user_id, photo_url, location_name, note, rating, users(display_name, username, avatar_url)';

export async function getRecentActivity(limit = 8) {
  const { data, error } = await supabase
    .from('wing_entries')
    .select(ACTIVITY_SELECT)
    .gt('amount', 0)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// Recent activity with each tagged group merged into one item, placed at its newest log.
export async function getRecentActivityWithSessions(limit = 8) {
  const recent = await getRecentActivity(limit * 3);
  const ids = recent.map(e => e.id).join(',');
  if (!ids) return [];

  const { data: seen, error: seenError } = await supabase
    .from('wing_tags')
    .select('entry_id')
    .eq('status', 'confirmed')
    .or(`entry_id.in.(${ids}),response_entry_id.in.(${ids})`);
  if (seenError) throw seenError;

  const hostIds = [...new Set(seen.map(t => t.entry_id))];
  if (!hostIds.length) return recent.slice(0, limit);

  const { data: tags, error: tagError } = await supabase
    .from('wing_tags')
    .select('entry_id, response_entry_id')
    .eq('status', 'confirmed')
    .in('entry_id', hostIds)
    .not('response_entry_id', 'is', null);
  if (tagError) throw tagError;

  const { data: members, error: memberError } = await supabase
    .from('wing_entries')
    .select(ACTIVITY_SELECT)
    .in('id', [...hostIds, ...tags.map(t => t.response_entry_id)]);
  if (memberError) throw memberError;

  const entryById = Object.fromEntries(members.map(e => [e.id, e]));
  const hostByEntry = {};
  const responsesByHost = {};
  for (const t of tags) {
    hostByEntry[t.response_entry_id] = t.entry_id;
    hostByEntry[t.entry_id] = t.entry_id;
    (responsesByHost[t.entry_id] ??= []).push(entryById[t.response_entry_id]);
  }

  const emitted = new Set();
  const feed = [];
  for (const entry of recent) {
    const hostId = hostByEntry[entry.id];
    if (hostId === undefined) { feed.push(entry); continue; }
    if (emitted.has(hostId)) continue;
    emitted.add(hostId);

    const host = entryById[hostId];
    const group = [host, ...responsesByHost[hostId].filter(Boolean)];
    feed.push({
      ...host,
      created_at: entry.created_at,
      session: {
        total: group.reduce((sum, e) => sum + e.amount, 0),
        participants: group.map(e => ({ name: e.users?.display_name || e.users?.username || 'Someone', amount: e.amount })),
      },
    });
  }
  return feed.slice(0, limit);
}

export async function getWingsOverTime() {
  const { data, error } = await supabase
    .from('wing_entries')
    .select('amount, created_at')
    .gt('amount', 0)
    .order('created_at', { ascending: true });
  if (error) throw error;

  // Group by date and compute cumulative sum
  const byDate = {};
  for (const e of data) {
    const date = new Date(e.created_at).toISOString().slice(0, 10);
    byDate[date] = (byDate[date] || 0) + e.amount;
  }

  let cumulative = 0;
  return Object.entries(byDate).map(([date, total]) => {
    cumulative += total;
    return { date, total, cumulative };
  });
}
