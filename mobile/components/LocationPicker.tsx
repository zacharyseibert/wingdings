import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors } from '../lib/colors';

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

async function fetchNearbyPlaces(lat: number, lng: number): Promise<Place[]> {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"restaurant|bar|pub|cafe|fast_food|food_court|brewery|biergarten|ice_cream"]["name"](around:${RADIUS_METERS},${lat},${lng});
      way["amenity"~"restaurant|bar|pub|cafe|fast_food|food_court|brewery|biergarten|ice_cream"]["name"](around:${RADIUS_METERS},${lat},${lng});
      node["shop"~"convenience|supermarket"]["name"](around:${RADIUS_METERS},${lat},${lng});
    );
    out center 60;
  `;

  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.elements ?? [])
    .filter((e: any) => e.tags?.name)
    .map((e: any) => {
      const eLat = e.lat ?? e.center?.lat ?? lat;
      const eLng = e.lon ?? e.center?.lon ?? lng;
      const dist = Math.round(
        Math.sqrt(Math.pow((eLat - lat) * 111320, 2) + Math.pow((eLng - lng) * 111320 * Math.cos(lat * Math.PI / 180), 2))
      );
      return {
        id: String(e.id),
        name: e.tags.name,
        type: e.tags.amenity?.replace('_', ' ') ?? 'place',
        distance: dist,
        lat: eLat,
        lng: eLng,
      };
    })
    .sort((a: Place, b: Place) => (a.distance ?? 0) - (b.distance ?? 0));
}

async function searchGlobal(query: string): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=15&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'WingdingsApp/1.0' } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data ?? []).map((e: any, i: number) => {
    const parts = [e.address?.name || e.name, e.address?.city || e.address?.town, e.address?.state].filter(Boolean);
    return {
      id: `nom-${i}`,
      name: parts[0] || e.display_name.split(',')[0],
      type: parts.slice(1).join(', ') || e.type,
      distance: undefined,
      lat: parseFloat(e.lat),
      lng: parseFloat(e.lon),
    };
  });
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
      setSearching(true);
      const results = await searchGlobal(search.trim());
      setSearchResults(results);
      setSearching(false);
    }, 400);
  }, [search]);

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
