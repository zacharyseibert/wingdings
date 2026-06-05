import { supabase } from './supabase';

export async function ensureProfile(userId: string, email: string) {
  const displayName = email.split('@')[0];
  await supabase.from('users').upsert(
    { id: `mob_${userId}`, username: displayName, display_name: displayName, auth_id: userId },
    { onConflict: 'auth_id', ignoreDuplicates: false }
  );
}

export async function getMobileUserId(authId: string): Promise<string> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single();
  return data?.id ?? `mob_${authId}`;
}

export async function logWings(userId: string, amount: number) {
  const { error } = await supabase
    .from('wing_entries')
    .insert({ user_id: userId, amount });
  if (error) throw error;
}

export async function getMyStats(userId: string) {
  const [userRes, historyRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase
      .from('wing_entries')
      .select('amount, created_at')
      .eq('user_id', userId)
      .gt('amount', 0)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);
  return { user: userRes.data, history: historyRes.data ?? [] };
}

export async function getLeaderboard() {
  const { data } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url, total_wings')
    .gt('total_wings', 0)
    .order('total_wings', { ascending: false })
    .limit(10);
  return data ?? [];
}
