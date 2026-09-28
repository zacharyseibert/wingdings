import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { ensureProfile } from '../lib/wings';
import { registerForPushNotifications } from '../lib/notifications';
import * as Linking from 'expo-linking';
import { colors } from '../lib/colors';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setConfirmed(true);
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
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); });

    // Race getSession against a 3s timeout so a hung network call never blocks the spinner
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>(resolve =>
      setTimeout(() => resolve({ data: { session: null } }), 3000)
    );

    Promise.race([sessionPromise, timeoutPromise]).then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
      if (!session) {
        setTimeout(() => setConfirmed(true), 1500);
      } else {
        setConfirmed(true);
      }

      // Set up foreground refresh AFTER getSession resolves — calling startAutoRefresh()
      // before getSession() can cause the SDK's internal refresh lock to block getSession,
      // hanging the spinner on cold start when the network is slow.
      appStateSub = AppState.addEventListener('change', state => {
        if (state === 'active') supabase.auth.startAutoRefresh();
        else supabase.auth.stopAutoRefresh();
      });
    });

    return () => {
      appStateSub?.remove();
      subscription.unsubscribe();
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || !confirmed) return;
    if (session) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [ready, confirmed, session]);

  if (!ready || !confirmed) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
