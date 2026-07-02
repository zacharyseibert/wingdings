import { supabase } from './client.js';

/**
 * Get competition by code
 */
export async function getCompetitionByCode(code) {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('code', code)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get competition by ID
 */
export async function getCompetition(competitionId) {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Join a competition (set user's competition_id).
 * Also sets competition_id on any other user rows sharing the same email,
 * so Slack-logged wings count toward the competition even before account merge.
 */
export async function joinCompetition(userId, code) {
  const competition = await getCompetitionByCode(code);
  if (!competition) {
    throw new Error('Invalid competition code');
  }

  // Get this user's email to find linked accounts
  const { data: thisUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  // Update competition_id on this user
  const { error } = await supabase
    .from('users')
    .update({ competition_id: competition.id })
    .eq('id', userId);
  if (error) throw error;

  // Also update any other rows with the same email (e.g. Slack user before merge)
  if (thisUser?.email) {
    await supabase
      .from('users')
      .update({ competition_id: competition.id })
      .eq('email', thisUser.email)
      .neq('id', userId);
  }

  return competition;
}

/**
 * Leave competition (set competition_id to null)
 */
export async function leaveCompetition(userId) {
  const { error } = await supabase
    .from('users')
    .update({ competition_id: null })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * Create a new competition (admin only)
 */
export async function createCompetition(name, code, createdBy) {
  const { data, error } = await supabase
    .from('competitions')
    .insert({ name, code, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}
