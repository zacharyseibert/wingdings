import { supabase } from './supabase';

/**
 * On mobile login, find existing user by email (Slack user) and link auth_id to them.
 * If no match, create a new mobile user.
 */
export async function ensureProfile(authId: string, email: string) {
  // Check if a user already exists with this email (e.g. a Slack user)
  const { data: existing } = await supabase
    .from('users')
    .select('id, auth_id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    // Link this auth session to the existing user if not already linked
    if (!existing.auth_id) {
      await supabase
        .from('users')
        .update({ auth_id: authId })
        .eq('id', existing.id);
    }
  } else {
    // No Slack user found — create a new mobile-only user
    const displayName = email.split('@')[0];
    await supabase.from('users').upsert(
      {
        id: `mob_${authId}`,
        username: displayName,
        display_name: displayName,
        email,
        auth_id: authId,
      },
      { onConflict: 'auth_id', ignoreDuplicates: false }
    );
  }
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
