import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  // Push notifications require a real device and a standalone/dev build
  if (!Device.isDevice) return;
  if (!Constants.expoConfig?.extra?.eas?.projectId && !Constants.easConfig?.projectId) {
    // Running in Expo Go without a project ID — skip silently
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`${API_URL}/api/mobile/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ pushToken }),
    }).catch(console.error);
  } catch (err) {
    // Silently fail in Expo Go — will work in production build
    console.log('[notifications] skipped:', err);
  }
}
