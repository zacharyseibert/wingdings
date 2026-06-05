import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { getMobileUserId, logWings, getMyStats } from '../../lib/wings';

const PRESETS = [1, 3, 6, 10, 12, 20];

export default function LogScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false);

  const loadUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = await getMobileUserId(session.user.id);
    setUserId(uid);
    const { user } = await getMyStats(uid);
    setTotal(user?.total_wings ?? 0);
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  async function handleLog(amount: number) {
    if (!userId || loading) return;
    setLoading(true);
    try {
      await logWings(userId, amount);
      setTotal(prev => prev + amount);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log Wings</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Total display */}
      <View style={[styles.totalBox, flash && styles.totalBoxFlash]}>
        <Text style={styles.totalEmoji}>🍗</Text>
        <Text style={[styles.totalNumber, flash && styles.totalNumberFlash]}>
          {total.toLocaleString()}
        </Text>
        <Text style={styles.totalLabel}>total wings eaten</Text>
      </View>

      {/* Preset buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick add</Text>
        <View style={styles.presets}>
          {PRESETS.map(n => (
            <TouchableOpacity
              key={n}
              style={styles.preset}
              onPress={() => handleLog(n)}
              disabled={loading}
            >
              <Text style={styles.presetText}>+{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && (
        <ActivityIndicator color="#E8722A" style={{ marginTop: 16 }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0F0A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 0,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#F5E6D3' },
  signOut: { color: '#78716c', fontSize: 14 },
  totalBox: {
    margin: 24,
    backgroundColor: '#2A1A10',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3D2618',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  totalBoxFlash: { borderColor: '#E8722A', backgroundColor: '#3D2010' },
  totalEmoji: { fontSize: 48 },
  totalNumber: { fontSize: 64, fontWeight: 'bold', color: '#E8722A' },
  totalNumberFlash: { color: '#ff9a5c' },
  totalLabel: { color: '#78716c', fontSize: 15 },
  section: { paddingHorizontal: 24 },
  sectionLabel: { color: '#78716c', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  preset: {
    backgroundColor: '#2A1A10',
    borderWidth: 1,
    borderColor: '#3D2618',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  presetText: { color: '#E8722A', fontSize: 20, fontWeight: '700' },
});
