import { supabase } from './client.js';

/**
 * Upsert a Slack user record (create if not exists, update name/avatar if changed).
 */
export async function upsertUser({ id, username, display_name, avatar_url }) {
  const { error } = await supabase
    .from('users')
    .upsert(
      { id, username, display_name, avatar_url },
      { onConflict: 'id', ignoreDuplicates: false }
    );
  if (error) throw error;
}

/**
 * Add (or subtract, if amount is negative) wings for a user.
 * Ensures the total never goes below 0.
 */
export async function addWings(userId, amount, note = null) {
  // Guard: fetch current total to prevent going negative
  const user = await getUser(userId);
  if (user && user.total_wings + amount < 0) {
    throw new RangeError(`You only have ${user.total_wings} wings — can't remove ${Math.abs(amount)}.`);
  }

  const { error } = await supabase
    .from('wing_entries')
    .insert({ user_id: userId, amount, note });
  if (error) throw error;
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

export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url, total_wings, updated_at')
    .gt('total_wings', 0)
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

export async function getGlobalStats() {
  const { data, error } = await supabase
    .from('users')
    .select('total_wings');
  if (error) throw error;
  const total = data.reduce((sum, u) => sum + u.total_wings, 0);
  const participants = data.filter(u => u.total_wings > 0).length;
  return { total, participants };
}
