import { supabase } from './client.js';

export const HWFFL_COMPETITION_ID = 1;
const TAG_LIFETIME_MS = 24 * 60 * 60 * 1000;
const MAX_TAGS_PER_ENTRY = 15;

function earliestValidTagTime() {
  return new Date(Date.now() - TAG_LIFETIME_MS).toISOString();
}

export async function createTags({ entryId, taggerId, taggedUserIds }) {
  const ids = [...new Set(taggedUserIds.filter(id => typeof id === 'string' && id !== taggerId))].slice(0, MAX_TAGS_PER_ENTRY);
  if (!ids.length) return [];

  const { data: members, error: memberError } = await supabase
    .from('users')
    .select('id, push_token')
    .in('id', ids)
    .eq('competition_id', HWFFL_COMPETITION_ID);
  if (memberError) throw memberError;
  if (!members.length) return [];

  const { data: tags, error } = await supabase
    .from('wing_tags')
    .insert(members.map(m => ({ entry_id: entryId, tagger_id: taggerId, tagged_id: m.id })))
    .select('id, tagged_id');
  if (error) throw error;

  return tags.map(t => ({ ...t, push_token: members.find(m => m.id === t.tagged_id)?.push_token ?? null }));
}

export async function getPendingTags(userId) {
  const { data, error } = await supabase
    .from('wing_tags')
    .select('id, created_at, tagger:users!wing_tags_tagger_id_fkey(display_name, username), entry:wing_entries!wing_tags_entry_id_fkey(location_name, created_at)')
    .eq('tagged_id', userId)
    .eq('status', 'pending')
    .gte('created_at', earliestValidTagTime())
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

// The conditional update guarantees a tag can only be claimed once, even on a double tap.
export async function claimTag(tagId, userId) {
  const { data, error } = await supabase
    .from('wing_tags')
    .update({ status: 'confirmed' })
    .eq('id', tagId)
    .eq('tagged_id', userId)
    .eq('status', 'pending')
    .gte('created_at', earliestValidTagTime())
    .select('id, entry_id, tagger_id, entry:wing_entries!wing_tags_entry_id_fkey(location_name, latitude, longitude)')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function releaseTag(tagId) {
  await supabase.from('wing_tags').update({ status: 'pending' }).eq('id', tagId);
}

export async function linkTagResponse(tagId, responseEntryId) {
  const { error } = await supabase.from('wing_tags').update({ response_entry_id: responseEntryId }).eq('id', tagId);
  if (error) throw error;
}

export async function declineTag(tagId, userId) {
  const { data, error } = await supabase
    .from('wing_tags')
    .update({ status: 'declined' })
    .eq('id', tagId)
    .eq('tagged_id', userId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSessionParticipantIds(entryId) {
  const { data, error } = await supabase
    .from('wing_tags')
    .select('tagger_id, tagged_id')
    .eq('entry_id', entryId)
    .eq('status', 'confirmed');
  if (error) throw error;
  if (!data.length) return [];
  return [data[0].tagger_id, ...data.map(t => t.tagged_id)];
}
