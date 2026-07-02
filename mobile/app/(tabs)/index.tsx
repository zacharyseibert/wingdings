import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Image,
  ScrollView, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { logWings, getMyStats } from '../../lib/wings';

const TOTAL_CACHE_KEY = 'wingdings:total_wings';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import LocationPicker from '../../components/LocationPicker';
import BadgeCelebration from '../../components/BadgeCelebration';
import { colors } from '../../lib/colors';

const PRESETS = [1, 5, 6, 10, 12];

export default function LogScreen() {
  const [total, setTotal] = useState(0);
  const [session, setSession] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [note, setNote] = useState('');
  const [newBadges, setNewBadges] = useState<any[]>([]);

  const loadUser = useCallback(async () => {
    try {
      // Show cached total immediately while network loads
      const cached = await AsyncStorage.getItem(TOTAL_CACHE_KEY);
      if (cached !== null) setTotal(parseInt(cached, 10));

      const { user } = await getMyStats();
      const fresh = user?.total_wings ?? 0;
      setTotal(fresh);
      AsyncStorage.setItem(TOTAL_CACHE_KEY, String(fresh));
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
    setPhotoUri(null);
    setLocationName(null);
    setNote('');
    setNewBadges([]);
  }


  async function handlePickPhoto() {
    Alert.alert('Add Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.4,
            allowsEditing: true,
            aspect: [4, 3],
          });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.4,
            allowsEditing: true,
            aspect: [4, 3],
          });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
      const result = await logWings(session, photoUri ?? undefined, locationName ?? undefined, note.trim() || undefined);
      setTotal(result.total_wings);
      AsyncStorage.setItem(TOTAL_CACHE_KEY, String(result.total_wings));
      setSession(0);
      setPhotoUri(null);
      setLocationName(null);
      setNote('');
      setFlash(true);
      setTimeout(() => setFlash(false), 800);

      if (result.newBadges.length > 0) {
        setNewBadges(result.newBadges);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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
              tintColor={colors.primary}
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
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
            />
            <Text style={styles.sessionLabel}>How many wings did you just eat?</Text>
          </View>

          {/* Quick add */}
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
          </View>

          {/* Stepper row */}
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => addToSession(-1)}>
              <Text style={styles.stepperText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => addToSession(1)}>
              <Text style={styles.stepperText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Photo + Location row */}
          <View style={styles.attachRow}>
            {photoUri ? (
              <TouchableOpacity style={[styles.attachChip, styles.attachChipActive]} onPress={() => setPhotoUri(null)}>
                <Text style={styles.attachChipText}>📷 Photo ✕</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.attachChip} onPress={handlePickPhoto}>
                <Text style={styles.attachChipText}>📷 Add photo</Text>
              </TouchableOpacity>
            )}
            {locationName ? (
              <TouchableOpacity style={[styles.attachChip, styles.attachChipActive]} onPress={() => setLocationName(null)}>
                <Text style={styles.attachChipText}>📍 {locationName} ✕</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.attachChip} onPress={() => setShowLocationPicker(true)}>
                <Text style={styles.attachChipText}>📍 Add location</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Photo preview */}
          {photoUri && (
            <View style={styles.photoPreviewBox}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            </View>
          )}

          {/* Note */}
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note... (sauce, style, etc.)"
            placeholderTextColor={colors.textSecondary}
            maxLength={120}
            returnKeyType="done"
            numberOfLines={1}
            multiline={false}
          />

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

      <LocationPicker
        visible={showLocationPicker}
        onSelect={(name) => setLocationName(name)}
        onClose={() => setShowLocationPicker(false)}
      />

      <BadgeCelebration badges={newBadges} onClose={() => setNewBadges([])} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingTop: 0 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: colors.text, paddingVertical: 16 },

  sectionLabel: { marginBottom: 8, marginTop: 4 },
  sectionLabelText: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },

  // Session box
  sessionBox: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  sessionInput: {
    fontSize: 72,
    fontWeight: 'bold',
    color: colors.primary,
    lineHeight: 80,
    textAlign: 'center',
    minWidth: 120,
  },
  sessionLabel: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },

  // Presets
  presets: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  preset: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  presetText: { color: colors.primary, fontSize: 18, fontWeight: '700' },

  stepperRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stepperBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  stepperText: { color: colors.text, fontSize: 22, fontWeight: '600' },

  // Attach row
  attachRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  attachChip: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachChipActive: { borderColor: colors.primary, backgroundColor: '#FFF7ED' },
  attachChipText: { color: colors.textSecondary, fontSize: 14 },
  photoPreviewBox: { marginBottom: 12 },
  photoPreview: { width: '100%', height: 180, borderRadius: 14 },
  noteInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
    height: 56,
    textAlignVertical: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },

  // Submit
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Total
  totalBox: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  totalBoxFlash: { borderColor: colors.success, backgroundColor: '#F0FDF4' },
  totalNumber: { fontSize: 52, fontWeight: 'bold', color: colors.text },
  totalNumberFlash: { color: colors.success },
});
