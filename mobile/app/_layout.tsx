import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { ensureProfile } from '../lib/wings';
import { registerForPushNotifications } from '../lib/notifications';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Refresh session when app comes to foreground — prevents iOS background suspension from expiring tokens
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await ensureProfile(session.user.id, session.user.email ?? '');
        registerForPushNotifications().catch(console.error);
      }
    });

    // Handle magic link deep link when app is already open
    const handleUrl = async ({ url }: { url: string }) => {
      if (url.includes('access_token') || url.includes('token_hash')) {
        const parsed = new URL(url);
        const tokenHash = parsed.searchParams.get('token_hash') ?? parsed.hash.split('token_hash=')[1]?.split('&')[0];
        const type = parsed.searchParams.get('type') ?? 'magiclink';
        if (tokenHash) {
          await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
        }
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    // Handle if app was launched from magic link
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); });

    return () => {
      appStateSub.remove();
      subscription.unsubscribe();
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (session) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [ready, session]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
