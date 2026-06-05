import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

interface Place {
  id: string;
  name: string;
  type: string;
  distance?: number;
}

interface Props {
  visible: boolean;
  onSelect: (name: string) => void;
  onClose: () => void;
}

async function fetchNearbyPlaces(lat: number, lng: number): Promise<Place[]> {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"~"restaurant|bar|pub|cafe|fast_food|food_court"]["name"](around:800,${lat},${lng});
      way["amenity"~"restaurant|bar|pub|cafe|fast_food|food_court"]["name"](around:800,${lat},${lng});
    );
    out center 30;
  `;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  });

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
      };
    })
    .sort((a: Place, b: Place) => (a.distance ?? 0) - (b.distance ?? 0));
}

export default function LocationPicker({ visible, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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
      load();
    }
  }, [visible, load]);

  const filtered = search.trim()
    ? places.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : places;

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
              placeholderTextColor="#78716c"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (search.trim()) { onSelect(search.trim()); onClose(); }
              }}
            />
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#E8722A" />
              <Text style={styles.loadingText}>Finding nearby places...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                search.trim() ? (
                  <TouchableOpacity style={styles.customRow} onPress={() => { onSelect(search.trim()); onClose(); }}>
                    <Text style={styles.customText}>📍 Use "{search.trim()}"</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.emptyText}>No nearby places found</Text>
                )
              }
              ListHeaderComponent={
                currentAddress ? (
                  <TouchableOpacity style={styles.addressRow} onPress={() => { onSelect(currentAddress); onClose(); }}>
                    <Text style={styles.addressIcon}>📍</Text>
                    <View>
                      <Text style={styles.addressName}>Current location</Text>
                      <Text style={styles.addressSub}>{currentAddress}</Text>
                    </View>
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.placeRow} onPress={() => { onSelect(item.name); onClose(); }}>
                  <Text style={styles.placeIcon}>🍽️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeName}>{item.name}</Text>
                    <Text style={styles.placeMeta}>{item.type}{item.distance ? ` · ${item.distance}m away` : ''}</Text>
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
  container: { flex: 1, backgroundColor: '#1A0F0A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#3D2618' },
  title: { fontSize: 18, fontWeight: '600', color: '#F5E6D3' },
  cancel: { color: '#E8722A', fontSize: 16 },
  searchBox: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#3D2618' },
  searchInput: { backgroundColor: '#2A1A10', borderRadius: 10, padding: 12, color: '#F5E6D3', fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#78716c', fontSize: 14 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#3D2618' },
  addressIcon: { fontSize: 20 },
  addressName: { color: '#F5E6D3', fontSize: 15, fontWeight: '500' },
  addressSub: { color: '#78716c', fontSize: 12, marginTop: 1 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#3D2618' },
  placeIcon: { fontSize: 20 },
  placeName: { color: '#F5E6D3', fontSize: 15, fontWeight: '500' },
  placeMeta: { color: '#78716c', fontSize: 12, marginTop: 1, textTransform: 'capitalize' },
  customRow: { padding: 14 },
  customText: { color: '#E8722A', fontSize: 15 },
  emptyText: { color: '#78716c', fontSize: 14, padding: 16 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#3D2618' },
  footerHint: { color: '#78716c', fontSize: 12, textAlign: 'center' },
});
