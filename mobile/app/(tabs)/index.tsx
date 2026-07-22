import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStateRefresh } from '../../lib/useAppStateRefresh';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Image,
  KeyboardAvoidingView, Platform,
  Animated,
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
import WingMayorCelebration from '../../components/WingMayorCelebration';
import StarRating from '../../components/StarRating';
import { colors } from '../../lib/colors';

const PRESETS = [1, 5, 6, 10, 12];

export default function LogScreen() {
  const [total, setTotal] = useState(0);
  const [session, setSession] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [newBadges, setNewBadges] = useState<any[]>([]);
  const [wingMayorLocation, setWingMayorLocation] = useState<string | null>(null);
  const [toast, setToast] = useState<{ total: number; badges: any[] } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(TOTAL_CACHE_KEY);
      if (cached !== null) setTotal(parseInt(cached, 10));
      const { user } = await getMyStats();
      const fresh = user?.total_wings ?? 0;
      setTotal(fresh);
      AsyncStorage.setItem(TOTAL_CACHE_KEY, String(fresh));
    } catch {}
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);
  useAppStateRefresh(loadUser);

  function addToSession(amount: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSession(prev => Math.max(0, prev + amount));
  }

  function clearSession() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSession(0);
    setPhotoUri(null);
    setLocationName(null);
    setLocationCoords(null);
    setNote('');
    setRating(null);
    setNewBadges([]);
  }

  function showToast(total: number, badges: any[]) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ total, badges });
    toastAnim.setValue(0);
    Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, 2800);
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
      const result = await logWings(session, photoUri ?? undefined, locationName ?? undefined, note.trim() || undefined, locationCoords ?? undefined, rating ?? undefined);
      setTotal(result.total_wings);
      AsyncStorage.setItem(TOTAL_CACHE_KEY, String(result.total_wings));
      setSession(0);
      setPhotoUri(null);
      setLocationName(null);
      setLocationCoords(null);
      setNote('');
      setRating(null);
      const mayorBadge = result.newBadges.find((b: any) => b.key === 'wing_mayor');
      const otherBadges = result.newBadges.filter((b: any) => b.key !== 'wing_mayor');

      showToast(result.total_wings, otherBadges);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (mayorBadge) setWingMayorLocation(locationName);
      if (otherBadges.length > 0) setNewBadges(otherBadges);
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
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.headerTitle}>Log Wings</Text>

          {/* Session counter */}
          <Text style={styles.sectionLabelText}>THIS SESSION</Text>
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
          <Text style={styles.sectionLabelText}>QUICK ADD</Text>
          <View style={styles.presets}>
            {PRESETS.map(n => (
              <TouchableOpacity key={n} style={styles.preset} onPress={() => addToSession(n)}>
                <Text style={styles.presetText}>+{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stepper */}
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => addToSession(-1)}>
              <Text style={styles.stepperText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => addToSession(1)}>
              <Text style={styles.stepperText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Photo + Location */}
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

          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
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

          {/* Rating */}
          <StarRating value={rating} onChange={setRating} />

          {/* Submit */}
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
        </View>
      </KeyboardAvoidingView>

      <LocationPicker
        visible={showLocationPicker}
        onSelect={(loc) => { setLocationName(loc.name); setLocationCoords(loc.lat && loc.lng ? { lat: loc.lat, lng: loc.lng } : null); }}
        onClose={() => setShowLocationPicker(false)}
      />

      {toast && (
        <Animated.View style={[
          styles.toast,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}>
          <Text style={styles.toastTotal}>🍗 {toast.total.toLocaleString()} wings total</Text>
          {toast.badges.length > 0 && (
            <Text style={styles.toastBadges}>
              {toast.badges.map((b: any) => b.emoji).join(' ')} New badge{toast.badges.length > 1 ? 's' : ''}!
            </Text>
          )}
        </Animated.View>
      )}

      <BadgeCelebration badges={newBadges} onClose={() => setNewBadges([])} />
      <WingMayorCelebration
        visible={wingMayorLocation !== null}
        locationName={wingMayorLocation ?? ''}
        onClose={() => setWingMayorLocation(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 0, justifyContent: 'center' },

  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, paddingVertical: 10 },
  sectionLabelText: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },

  sessionBox: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  sessionInput: {
    fontSize: 60,
    fontWeight: 'bold',
    color: colors.primary,
    lineHeight: 68,
    textAlign: 'center',
    minWidth: 120,
  },
  sessionLabel: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },

  presets: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  preset: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  presetText: { color: colors.primary, fontSize: 17, fontWeight: '700' },

  stepperRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stepperBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  stepperText: { color: colors.text, fontSize: 22, fontWeight: '600' },

  attachRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  attachChip: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachChipActive: { borderColor: colors.primary, backgroundColor: '#FFF7ED' },
  attachChipText: { color: colors.textSecondary, fontSize: 14 },

  photoPreview: { width: '100%', height: 140, borderRadius: 14, marginBottom: 8 },

  noteInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    height: 48,
    textAlignVertical: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toastTotal: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  toastBadges: { color: '#DDDDDD', fontSize: 14, marginTop: 4 },
});
