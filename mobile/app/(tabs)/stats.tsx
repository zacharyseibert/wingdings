import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { getMobileUserId, getMyStats } from '../../lib/wings';

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function StatsScreen() {
  const [stats, setStats] = useState<{ user: any; history: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = await getMobileUserId(session.user.id);
      const data = await getMyStats(uid);
      setStats(data);
    } catch (err) {
      console.error('[stats] error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#E8722A" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const { user, history } = stats ?? { user: null, history: [] };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#E8722A" />}
      >
        <Text style={styles.title}>My Stats</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Wings</Text>
          <Text style={styles.bigNumber}>{user?.total_wings ?? 0}</Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Entries</Text>
        {history.length === 0 ? (
          <Text style={styles.empty}>No entries yet — go eat some wings!</Text>
        ) : (
          history.map((e, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowAmount}>+{e.amount} wings</Text>
              <Text style={styles.rowTime}>{timeAgo(e.created_at)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0F0A' },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F5E6D3', marginBottom: 20 },
  card: {
    backgroundColor: '#2A1A10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3D2618',
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  cardLabel: { color: '#78716c', fontSize: 14, marginBottom: 8 },
  bigNumber: { fontSize: 56, fontWeight: 'bold', color: '#E8722A' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#F5E6D3', marginBottom: 12 },
  empty: { color: '#78716c', fontSize: 15 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3D2618',
  },
  rowAmount: { color: '#E8722A', fontSize: 17, fontWeight: '600' },
  rowTime: { color: '#78716c', fontSize: 14 },
});
