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
 * Join a competition (set user's competition_id)
 */
export async function joinCompetition(userId, code) {
  const competition = await getCompetitionByCode(code);
  if (!competition) {
    throw new Error('Invalid competition code');
  }

  const { error } = await supabase
    .from('users')
    .update({ competition_id: competition.id })
    .eq('id', userId);

  if (error) throw error;
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
