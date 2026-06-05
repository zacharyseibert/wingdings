import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { getMobileUserId, getMyStats } from '../../lib/wings';

export default function ProfileScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setEmail(session.user.email ?? null);
    const uid = await getMobileUserId(session.user.id);
    const { user } = await getMyStats(uid);
    setUser(user);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#E8722A" />}
      >
        <Text style={styles.title}>Profile</Text>

        {/* Avatar placeholder */}
        <View style={styles.avatarBox}>
          {user?.avatar_url
            ? null
            : <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.display_name || email || '?')[0].toUpperCase()}
                </Text>
              </View>
          }
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

        {/* Account type */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Account type</Text>
          <Text style={styles.infoValue}>
            {user?.id?.startsWith('mob_') ? 'Mobile only' : 'Linked with Slack ✓'}
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
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8722A',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
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
});
