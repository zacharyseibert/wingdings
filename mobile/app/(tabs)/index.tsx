import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput,
  ScrollView, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { getMobileUserId, logWings, getMyStats } from '../../lib/wings';

import * as Haptics from 'expo-haptics';

const PRESETS = [1, 3, 6, 10, 12, 20];

export default function LogScreen() {
  const [total, setTotal] = useState(0);
  const [session, setSession] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;
      const uid = await getMobileUserId(authSession.user.id);
      const { user } = await getMyStats(uid);
      setTotal(user?.total_wings ?? 0);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  function addToSession(amount: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSession(prev => Math.max(0, prev + amount));
  }

  function clearSession() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSession(0);
  }

  function handleSessionInput(text: string) {
    const n = parseInt(text, 10);
    if (text === '') setSession(0);
    else if (!isNaN(n) && n >= 0) setSession(n);
  }

  async function handleSubmit() {
    if (session <= 0) {
      Alert.alert('Nothing to log', 'Add some wings first!');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const newTotal = await logWings(session);
      setTotal(newTotal);
      setSession(0);
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadUser(); }}
              tintColor="#E8722A"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.headerTitle}>Log Wings</Text>

          {/* Session counter — editable */}
          <View style={styles.sectionLabel}><Text style={styles.sectionLabelText}>THIS SESSION</Text></View>
          <View style={styles.sessionBox}>
            <TextInput
              style={styles.sessionInput}
              value={session === 0 ? '' : String(session)}
              onChangeText={handleSessionInput}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#78716c"
              returnKeyType="done"
            />
            <Text style={styles.sessionLabel}>wings to log</Text>
          </View>

          {/* Quick add + clear */}
          <View style={styles.sectionLabel}><Text style={styles.sectionLabelText}>QUICK ADD</Text></View>
          <View style={styles.presets}>
            {PRESETS.map(n => (
              <TouchableOpacity
                key={n}
                style={styles.preset}
                onPress={() => addToSession(n)}
              >
                <Text style={styles.presetText}>+{n}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.preset, styles.clearBtn]} onPress={clearSession}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitBtn, session === 0 && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || session === 0}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>
                  {session > 0 ? `Log ${session} Wing${session === 1 ? '' : 's'} 🍗` : 'Log Wings 🍗'}
                </Text>
            }
          </TouchableOpacity>

          {/* Total wings */}
          <View style={styles.sectionLabel}><Text style={styles.sectionLabelText}>TOTAL WINGS EATEN</Text></View>
          <View style={[styles.totalBox, flash && styles.totalBoxFlash]}>
            <Text style={[styles.totalNumber, flash && styles.totalNumberFlash]}>
              {total.toLocaleString()}
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0F0A' },
  scroll: { padding: 20, paddingTop: 0 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#F5E6D3', paddingVertical: 16 },

  sectionLabel: { marginBottom: 8, marginTop: 4 },
  sectionLabelText: { color: '#78716c', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },

  // Session box
  sessionBox: {
    backgroundColor: '#2A1A10',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3D2618',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  sessionInput: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#E8722A',
    lineHeight: 80,
    textAlign: 'center',
    minWidth: 120,
  },
  sessionLabel: { color: '#78716c', fontSize: 14, marginTop: 4 },

  // Presets
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  preset: {
    backgroundColor: '#2A1A10',
    borderWidth: 1,
    borderColor: '#3D2618',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 70,
    alignItems: 'center',
  },
  presetText: { color: '#E8722A', fontSize: 20, fontWeight: '700' },

  clearBtn: { borderColor: '#7f1d1d' },
  clearBtnText: { color: '#ef4444', fontSize: 20, fontWeight: '700' },

  // Submit
  submitBtn: {
    backgroundColor: '#E8722A',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitBtnDisabled: { backgroundColor: '#3D2618' },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Total
  totalBox: {
    backgroundColor: '#2A1A10',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3D2618',
    alignItems: 'center',
    paddingVertical: 24,
  },
  totalBoxFlash: { borderColor: '#E8722A' },
  totalNumber: { fontSize: 52, fontWeight: 'bold', color: '#F5E6D3' },
  totalNumberFlash: { color: '#E8722A' },
});
