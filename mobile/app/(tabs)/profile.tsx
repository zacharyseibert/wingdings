import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image,
  TouchableOpacity, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import { getMobileUserId, getMyStats } from '../../lib/wings';

export default function ProfileScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setEmail(session.user.email ?? null);

      const { user } = await getMyStats();
      setUser(user);

      // Fetch badges (non-blocking)
      fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/badges/${user.id}`)
        .then(res => res.json())
        .then(({ data }) => setBadges(data ?? []))
        .catch(() => {});
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleEditAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase();
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
    const path = `avatars/${user.id}.${ext}`;

    setUploadingAvatar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const formData = new FormData();
      formData.append('file', { uri, name: `avatar.${ext}`, type: mimeType } as any);

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/wing-photos/${path}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            'x-upsert': 'true',
          },
          body: formData,
        }
      );

      if (!res.ok) throw new Error('Upload failed');

      const { data } = supabase.storage.from('wing-photos').getPublicUrl(path);
      const avatarUrl = data.publicUrl;

      await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', user.id);
      setUser((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not update photo');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await AsyncStorage.clear();
        await supabase.auth.signOut({ scope: 'local' });
        router.replace('/(auth)/login');
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#E8722A" />}
      >
        <Text style={styles.title}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarBox}>
          <TouchableOpacity
            onPress={true ? handleEditAvatar : undefined}
            activeOpacity={true ? 0.7 : 1}
            style={{ marginBottom: 12 }}
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.display_name || email || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            {true && (
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>{uploadingAvatar ? '...' : '✎'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{user?.display_name || user?.username || '—'}</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Stats summary */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{user?.total_wings ?? 0}</Text>
            <Text style={styles.statLabel}>Total Wings</Text>
          </View>
        </View>

        {/* Badges */}
        {badges.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🎖️ Badges ({badges.length})</Text>
            <View style={styles.badgeGrid}>
              {badges.map((badge, i) => (
                <View key={i} style={styles.badgeCard}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDesc}>{badge.desc}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Account type */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Account type</Text>
          <Text style={styles.infoValue}>
            {true ? 'Mobile only' : 'Linked with Slack ✓'}
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0F0A' },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F5E6D3', marginBottom: 28 },
  avatarBox: { alignItems: 'center', marginBottom: 32 },
  avatarImage: {
    width: 80, height: 80, borderRadius: 40,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8722A',
    alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#E8722A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#1A0F0A',
  },
  editBadgeText: { color: '#fff', fontSize: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#F5E6D3', marginBottom: 4 },
  emailText: { color: '#78716c', fontSize: 14 },
  statsRow: { marginBottom: 24 },
  statBox: {
    backgroundColor: '#2A1A10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3D2618',
    padding: 24,
    alignItems: 'center',
  },
  statNumber: { fontSize: 48, fontWeight: 'bold', color: '#E8722A' },
  statLabel: { color: '#78716c', fontSize: 14, marginTop: 4 },
  infoBox: {
    backgroundColor: '#2A1A10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3D2618',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  infoLabel: { color: '#78716c', fontSize: 14 },
  infoValue: { color: '#F5E6D3', fontSize: 14, fontWeight: '500' },
  signOutButton: {
    backgroundColor: '#2A1A10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3D2618',
    padding: 16,
    alignItems: 'center',
  },
  signOutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#F5E6D3', marginBottom: 12, marginTop: 8 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  badgeCard: {
    width: '47%',
    backgroundColor: '#2A1A10',
    borderWidth: 1,
    borderColor: '#3D2618',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  badgeEmoji: { fontSize: 36, marginBottom: 8 },
  badgeName: { fontSize: 14, fontWeight: '600', color: '#F5E6D3', marginBottom: 4, textAlign: 'center' },
  badgeDesc: { fontSize: 11, color: '#78716c', textAlign: 'center' },
});
