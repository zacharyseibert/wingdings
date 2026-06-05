import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput,
  ScrollView, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { getMobileUserId, logWings, getMyStats } from '../../lib/wings';

const PRESETS = [1, 3, 6, 10, 12, 20];

export default function LogScreen() {
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = await getMobileUserId(session.user.id);
      const { user } = await getMyStats(uid);
      setTotal(user?.total_wings ?? 0);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  async function handleLog(amount: number) {
    if (loading) return;
    if (amount <= 0 || amount > 10000) {
      Alert.alert('Invalid amount', 'Enter a number between 1 and 10,000.');
      return;
    }
    setLoading(true);
    try {
      const newTotal = await logWings(amount);
      setTotal(newTotal);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
      setCustomAmount('');
      setShowCustom(false);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit() {
    const n = parseInt(customAmount, 10);
    if (isNaN(n) || n <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid number.');
      return;
    }
    handleLog(n);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadUser(); }}
              tintColor="#E8722A"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Log Wings</Text>
          </View>

          {/* Total display */}
          <View style={[styles.totalBox, flash && styles.totalBoxFlash]}>
            <Text style={styles.totalEmoji}>🍗</Text>
            <Text style={[styles.totalNumber, flash && styles.totalNumberFlash]}>
              {total.toLocaleString()}
            </Text>
            <Text style={styles.totalLabel}>total wings eaten</Text>
            <Text style={styles.pullHint}>pull to refresh</Text>
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

          {/* Custom amount */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Custom amount</Text>
            {showCustom ? (
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#78716c"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCustomSubmit}
                />
                <TouchableOpacity
                  style={[styles.customButton, loading && styles.buttonDisabled]}
                  onPress={handleCustomSubmit}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.customButtonText}>Add</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setShowCustom(false); setCustomAmount(''); }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.customTrigger}
                onPress={() => setShowCustom(true)}
              >
                <Text style={styles.customTriggerText}>+ Enter custom number</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0F0A' },
  scroll: { padding: 20, paddingTop: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#F5E6D3' },
  signOut: { color: '#78716c', fontSize: 14 },
  totalBox: {
    backgroundColor: '#2A1A10',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3D2618',
    alignItems: 'center',
    paddingVertical: 36,
    gap: 6,
    marginBottom: 28,
  },
  totalBoxFlash: { borderColor: '#E8722A', backgroundColor: '#3D2010' },
  totalEmoji: { fontSize: 48 },
  totalNumber: { fontSize: 64, fontWeight: 'bold', color: '#E8722A' },
  totalNumberFlash: { color: '#ff9a5c' },
  totalLabel: { color: '#78716c', fontSize: 15 },
  pullHint: { color: '#3D2618', fontSize: 11, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionLabel: { color: '#78716c', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preset: {
    backgroundColor: '#2A1A10',
    borderWidth: 1,
    borderColor: '#3D2618',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 76,
    alignItems: 'center',
  },
  presetText: { color: '#E8722A', fontSize: 20, fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  customInput: {
    flex: 1,
    backgroundColor: '#2A1A10',
    borderWidth: 1,
    borderColor: '#E8722A',
    borderRadius: 12,
    padding: 14,
    color: '#F5E6D3',
    fontSize: 24,
    textAlign: 'center',
  },
  customButton: {
    backgroundColor: '#E8722A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  customButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { paddingHorizontal: 4 },
  cancelText: { color: '#78716c', fontSize: 14 },
  customTrigger: {
    backgroundColor: '#2A1A10',
    borderWidth: 1,
    borderColor: '#3D2618',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  customTriggerText: { color: '#78716c', fontSize: 15 },
});
