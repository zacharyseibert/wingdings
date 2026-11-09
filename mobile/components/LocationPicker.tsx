import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors } from '../lib/colors';
import PlaceSearch, { NativePlace } from '../modules/place-search';

interface Place {
  id: string;
  name: string;
  type: string;
  distance?: number;
  lat?: number;
  lng?: number;
}

export interface LocationSelection {
  name: string;
  lat?: number;
  lng?: number;
}

interface Props {
  visible: boolean;
  onSelect: (loc: LocationSelection) => void;
  onClose: () => void;
}

const RADIUS_METERS = 8047; // 5 miles

function categoryLabel(category: string | null) {
  if (!category) return 'place';
  return category.replace('MKPOICategory', '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function toPlace(p: NativePlace, i: number, type: string): Place {
  return { id: `${p.lat},${p.lng}-${i}`, name: p.name, type, distance: p.distance ?? undefined, lat: p.lat, lng: p.lng };
}

async function fetchNearbyPlaces(lat: number, lng: number): Promise<Place[]> {
  const results = await PlaceSearch.nearby(lat, lng, RADIUS_METERS);
  return results
    .map((p, i) => toPlace(p, i, categoryLabel(p.category)))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}

async function searchPlaces(query: string, coords: { lat: number; lng: number } | null): Promise<Place[]> {
  const results = await PlaceSearch.search(query, coords?.lat ?? null, coords?.lng ?? null);
  return results.map((p, i) => toPlace(p, i, [p.city, p.state].filter(Boolean).join(', ') || categoryLabel(p.category)));
}

export default function LocationPicker({ visible, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearch = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      setCoords({ lat, lng });

      const [nearby, [place]] = await Promise.all([
        fetchNearbyPlaces(lat, lng),
        Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
      ]);

      setPlaces(nearby);
      if (place) {
        const addr = [place.name, place.city, place.region].filter(Boolean).slice(0, 2).join(', ');
        setCurrentAddress(addr);
      }
    } catch (err) {
      console.error('LocationPicker error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setSearchResults([]);
      load();
    }
  }, [visible, load]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!search.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      const requestId = ++latestSearch.current;
      setSearching(true);
      const results = await searchPlaces(search.trim(), coords).catch(() => []);
      if (requestId !== latestSearch.current) return;
      setSearchResults(results);
      setSearching(false);
    }, 400);
  }, [search, coords]);

  const isSearching = search.trim().length > 0;
  const filtered = isSearching ? searchResults : places;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search or type a location..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (search.trim()) { onSelect({ name: search.trim() }); onClose(); }
              }}
            />
          </View>

          {(loading || searching) ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>{searching ? 'Searching...' : 'Finding nearby places...'}</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                search.trim() ? (
                  <TouchableOpacity style={styles.customRow} onPress={() => { onSelect({ name: search.trim() }); onClose(); }}>
                    <Text style={styles.customText}>📍 Use "{search.trim()}"</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.emptyText}>No nearby places found</Text>
                )
              }
              ListHeaderComponent={
                !isSearching && currentAddress ? (
                  <TouchableOpacity style={styles.addressRow} onPress={() => { onSelect({ name: currentAddress, lat: coords?.lat, lng: coords?.lng }); onClose(); }}>
                    <Text style={styles.addressIcon}>📍</Text>
                    <View>
                      <Text style={styles.addressName}>Current location</Text>
                      <Text style={styles.addressSub}>{currentAddress}</Text>
                    </View>
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.placeRow} onPress={() => { onSelect({ name: item.name, lat: item.lat, lng: item.lng }); onClose(); }}>
                  <Text style={styles.placeIcon}>🍽️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeName}>{item.name}</Text>
                    <Text style={styles.placeMeta}>{item.type}{item.distance ? ` · ${(item.distance / 1609).toFixed(1)} mi away` : ''}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Type custom */}
          {!loading && search.trim().length === 0 && (
            <View style={styles.footer}>
              <Text style={styles.footerHint}>Or type any location in the search box above</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  cancel: { color: colors.primary, fontSize: 16 },
  searchBox: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.card, borderRadius: 10, padding: 12, color: colors.text, fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  addressIcon: { fontSize: 20 },
  addressName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  addressSub: { color: colors.textSecondary, fontSize: 12, marginTop: 1 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  placeIcon: { fontSize: 20 },
  placeName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  placeMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 1, textTransform: 'capitalize' },
  customRow: { padding: 14 },
  customText: { color: colors.primary, fontSize: 15 },
  emptyText: { color: colors.textSecondary, fontSize: 14, padding: 16 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  footerHint: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
});
