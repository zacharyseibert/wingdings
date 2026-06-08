import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

/**
 * On mobile login, link this auth session to the right user:
 * 1. If a Slack user exists with this email → link auth_id to them
 * 2. If a mob_ user exists with this email → reuse it
 * 3. Otherwise create a new mob_ user
 */
export async function ensureProfile(authId: string, email: string) {
  // Look for any existing user with this email
  const { data: existing } = await supabase
    .from('users')
    .select('id, auth_id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    // Link auth_id if not already set
    if (!existing.auth_id) {
      await supabase
        .from('users')
        .update({ auth_id: authId })
        .eq('id', existing.id);
    }
  } else {
    // No user found — create a new mobile-only user
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

export async function uploadWingPhoto(userId: string, uri: string): Promise<string> {
  const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase().replace('jpeg', 'jpg');
  const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const filename = `${Date.now()}.${ext}`;
  const path = `${userId}/${filename}`;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not logged in');

  const formData = new FormData();
  formData.append('file', { uri, name: filename, type: mimeType } as any);

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/wing-photos/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Upload failed: ${err}`);
  }

  const { data } = supabase.storage.from('wing-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function logWings(amount: number, photoUri?: string, locationName?: string, note?: string): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not logged in');

  // Upload photo first if provided
  let photoUrl: string | undefined;
  if (photoUri) {
    const userId = await getMobileUserId(session.user.id);
    photoUrl = await uploadWingPhoto(userId, photoUri);
  }

  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      amount,
      photoUrl,
      locationName,
      note,
      localHour: new Date().getHours(), // Send user's local hour for timezone-aware badges
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to log wings');
  }

  const data = await res.json();
  return { total_wings: data.total_wings, newBadges: data.newBadges ?? [] };
}

export async function getMyStats() {
  // Use API endpoint instead of Supabase client (faster)
  console.log('[getMyStats] starting...');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not logged in');

  console.log('[getMyStats] fetching from API...');
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/stats`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  console.log('[getMyStats] got response:', res.status);
  if (!res.ok) throw new Error('Failed to fetch stats');
  const data = await res.json();
  console.log('[getMyStats] done');
  return data;
}

export async function getLeaderboard(competitionId?: number | null) {
  // Use API instead of Supabase client (faster)
  const url = competitionId
    ? `${process.env.EXPO_PUBLIC_API_URL}/api/leaderboard?limit=10&competitionId=${competitionId}`
    : `${process.env.EXPO_PUBLIC_API_URL}/api/leaderboard?limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const { data } = await res.json();
  return data ?? [];
}

export async function joinCompetition(code: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not logged in');

  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/competition/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to join competition');
  }

  const { competition } = await res.json();
  return competition;
}

export async function leaveCompetition() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not logged in');

  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/competition/leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to leave competition');
  }

  return true;
}
