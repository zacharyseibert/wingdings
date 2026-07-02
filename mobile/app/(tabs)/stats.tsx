import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Image, TouchableOpacity, Alert,
  Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageViewer from '../../components/ImageViewer';
import { colors } from '../../lib/colors';
import { getMyStats } from '../../lib/wings';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DELETE_WIDTH = 80;

function SwipeableRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const [rowHeight, setRowHeight] = useState(0);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < Math.abs(g.dx),
    onPanResponderMove: (_, g) => {
      const x = Math.max(-DELETE_WIDTH, Math.min(0, g.dx + (isOpen.current ? -DELETE_WIDTH : 0)));
      translateX.setValue(x);
    },
    onPanResponderRelease: (_, g) => {
      const shouldOpen = g.dx < -DELETE_WIDTH / 2 || (isOpen.current && g.dx < DELETE_WIDTH / 2);
      isOpen.current = shouldOpen;
      Animated.spring(translateX, { toValue: shouldOpen ? -DELETE_WIDTH : 0, useNativeDriver: true, bounciness: 0 }).start();
    },
  })).current;

  return (
    <View style={{ overflow: 'hidden', height: rowHeight || undefined }}>
      {rowHeight > 0 && (
        <View style={[styles.deleteAction, { height: rowHeight }]}>
          <TouchableOpacity style={styles.deleteActionInner} onPress={() => {
            Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
            isOpen.current = false;
            onDelete();
          }}>
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        onLayout={e => setRowHeight(e.nativeEvent.layout.height)}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const STATS_CACHE_KEY = 'wingdings:my_stats_cache';

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
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      // Show cached data immediately
      const cached = await AsyncStorage.getItem(STATS_CACHE_KEY);
      if (cached) {
        setStats(JSON.parse(cached));
        setLoading(false);
      }

      const data = await getMyStats();
      setStats(data);
      AsyncStorage.setItem(STATS_CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[stats] error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(entry: any) {
    Alert.alert(
      'Delete Entry',
      `Remove ${entry.amount} wings from ${new Date(entry.created_at).toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          setDeletingId(entry.id);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${API_URL}/api/mobile/entry/${entry.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error('Failed to delete');
            const { total_wings } = await res.json();
            setStats(prev => prev ? {
              user: { ...prev.user, total_wings },
              history: prev.history.filter(e => e.id !== entry.id),
            } : prev);
          } catch {
            Alert.alert('Error', 'Could not delete entry.');
          } finally {
            setDeletingId(null);
          }
        }},
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const { user, history } = stats ?? { user: null, history: [] };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
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
            <SwipeableRow key={e.id ?? i} onDelete={() => e.id && handleDelete(e)}>
              <View style={[styles.row, deletingId === e.id && { opacity: 0.4 }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.rowAmount}>+{e.amount} wings</Text>
                    <Text style={styles.rowTime}>{timeAgo(e.created_at)}</Text>
                  </View>
                  {e.note && <Text style={styles.rowLocation}>💬 {e.note}</Text>}
                  {e.location_name && <Text style={styles.rowLocation}>📍 {e.location_name}</Text>}
                  {e.photo_url && (
                    <TouchableOpacity onPress={() => setViewingImage(e.photo_url)}>
                      <Image
                        source={{ uri: e.photo_url }}
                        style={{ width: '100%', height: 140, borderRadius: 10, marginTop: 8 }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </SwipeableRow>
          ))
        )}
      </ScrollView>
      <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  cardLabel: { color: colors.textSecondary, fontSize: 14, marginBottom: 8 },
  bigNumber: { fontSize: 56, fontWeight: 'bold', color: colors.primary },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  empty: { color: colors.textSecondary, fontSize: 15 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowAmount: { color: colors.primary, fontSize: 17, fontWeight: '600' },
  rowTime: { color: colors.textSecondary, fontSize: 14 },
  rowLocation: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  deleteAction: {
    position: 'absolute', right: 0, top: 0,
    width: DELETE_WIDTH, backgroundColor: colors.error,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteActionInner: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  deleteActionText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
