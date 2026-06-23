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
import { getMobileUserId, getMyStats, joinCompetition, leaveCompetition } from '../../lib/wings';
import { ALL_BADGES } from '../../lib/badges';
import { colors } from '../../lib/colors';

export default function ProfileScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [competition, setCompetition] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setEmail(session.user.email ?? null);

      const stats = await getMyStats();
      setUser(stats.user);
      setCompetition(stats.competition);

      // Fetch badges (non-blocking)
      fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/badges/${stats.user.id}`)
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

  async function handleJoinCompetition() {
    Alert.prompt(
      'Join Competition',
      'Enter the competition code:',
      async (code) => {
        if (!code) return;
        try {
          const comp = await joinCompetition(code);
          setCompetition(comp);
          Alert.alert('Success!', `You joined ${comp.name}`);
          load();
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Invalid competition code');
        }
      }
    );
  }

  async function handleLeaveCompetition() {
    Alert.alert(
      'Leave Competition',
      `Leave ${competition?.name}? You'll return to the global leaderboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await leaveCompetition();
            setCompetition(null);
            Alert.alert('Left competition', 'You\'re now on the global leaderboard');
            load();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to leave competition');
          }
        }},
      ]
    );
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

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your wing data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/delete-account`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error('Failed to delete account');
            await AsyncStorage.clear();
            await supabase.auth.signOut({ scope: 'local' });
            router.replace('/(auth)/login');
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not delete account. Please try again.');
          }
        }},
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
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
        <Text style={styles.sectionTitle}>🎖️ Badges ({badges.length}/{ALL_BADGES.length})</Text>
        <View style={styles.badgeGrid}>
          {ALL_BADGES.map((badgeDef) => {
            const earned = badges.find(b => b.key === badgeDef.key);
            const isEarned = !!earned;
            return (
              <View key={badgeDef.key} style={[styles.badgeCard, !isEarned && styles.badgeCardLocked]}>
                <Text style={[styles.badgeEmoji, !isEarned && styles.badgeEmojiLocked]}>{badgeDef.emoji}</Text>
                <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]}>{badgeDef.name}</Text>
                <Text style={[styles.badgeDesc, !isEarned && styles.badgeDescLocked]}>{badgeDef.desc}</Text>
              </View>
            );
          })}
        </View>

        {/* Competition */}
        <Text style={styles.sectionTitle}>🏆 Competition</Text>
        {competition ? (
          <View style={styles.competitionBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.competitionName}>{competition.name}</Text>
              <Text style={styles.competitionCode}>Code: {competition.code}</Text>
            </View>
            <TouchableOpacity onPress={handleLeaveCompetition}>
              <Text style={styles.leaveButton}>Leave</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.joinButton} onPress={handleJoinCompetition}>
            <Text style={styles.joinButtonText}>Join Competition</Text>
          </TouchableOpacity>
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

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 28 },
  avatarBox: { alignItems: 'center', marginBottom: 32 },
  avatarImage: {
    width: 80, height: 80, borderRadius: 40,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  editBadgeText: { color: '#fff', fontSize: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  emailText: { color: colors.textSecondary, fontSize: 14 },
  statsRow: { marginBottom: 24 },
  statBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
  statNumber: { fontSize: 48, fontWeight: 'bold', color: colors.primary },
  statLabel: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  infoBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  infoLabel: { color: colors.textSecondary, fontSize: 14 },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '500' },
  signOutButton: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: { color: colors.error, fontSize: 16, fontWeight: '600' },
  deleteButton: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  deleteText: { color: colors.textLight, fontSize: 14 },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12, marginTop: 8 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  badgeCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  badgeEmoji: { fontSize: 36, marginBottom: 8 },
  badgeName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4, textAlign: 'center' },
  badgeDesc: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  badgeCardLocked: {
    opacity: 0.3,
  },
  badgeEmojiLocked: {
    opacity: 0.5,
  },
  badgeNameLocked: {
    color: colors.textSecondary,
  },
  badgeDescLocked: {
    color: colors.textLight,
  },
  competitionBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  competitionName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  competitionCode: { fontSize: 12, color: colors.textSecondary },
  leaveButton: { color: colors.error, fontSize: 14, fontWeight: '600' },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  joinButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
