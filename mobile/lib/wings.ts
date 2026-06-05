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
  const path = `${userId}/${Date.now()}.${ext}`;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not logged in');

  // Use FileSystem.uploadAsync — most reliable way to upload binary files in React Native
  const result = await FileSystem.uploadAsync(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/wing-photos/${path}`,
    uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        'Content-Type': mimeType,
        'x-upsert': 'false',
      },
    }
  );

  if (result.status !== 200) {
    throw new Error(`Upload failed: ${result.body}`);
  }

  const { data } = supabase.storage.from('wing-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function logWings(amount: number, photoUri?: string, locationName?: string): Promise<number> {
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
    body: JSON.stringify({ amount, photoUrl, locationName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to log wings');
  }

  const data = await res.json();
  return data.total_wings;
}

export async function getMyStats(userId: string) {
  const [userRes, historyRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase
      .from('wing_entries')
      .select('amount, created_at, photo_url, location_name')
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
