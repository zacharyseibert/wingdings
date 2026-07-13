import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStateRefresh } from '../../lib/useAppStateRefresh';
import { colors } from '../../lib/colors';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface WingLocation {
  name: string;
  latitude: number;
  longitude: number;
  totalWings: number;
  visitors: string[];
}

export default function MapScreen() {
  const [locations, setLocations] = useState<WingLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/locations`);
      const { data } = await res.json();
      setLocations(data ?? []);
    } catch (err) {
      console.error('[map]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAppStateRefresh(load);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const initialRegion = locations.length > 0 ? {
    latitude: locations.reduce((s, l) => s + l.latitude, 0) / locations.length,
    longitude: locations.reduce((s, l) => s + l.longitude, 0) / locations.length,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  } : {
    latitude: 37.78,
    longitude: -122.43,
    latitudeDelta: 10,
    longitudeDelta: 10,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>🗺️ Wing Map</Text>
      {locations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No locations logged yet!</Text>
          <Text style={styles.emptyHint}>Add a location when logging wings to see it here.</Text>
        </View>
      ) : (
        <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation>
          {locations.map((loc, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              pinColor={colors.primary}
            >
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{loc.name}</Text>
                  <Text style={styles.calloutWings}>🍗 {loc.totalWings.toLocaleString()} wings total</Text>
                  {loc.visitors.length > 0 && (
                    <Text style={styles.calloutVisitors}>
                      {loc.visitors.slice(0, 3).join(', ')}
                      {loc.visitors.length > 3 ? ` +${loc.visitors.length - 3} more` : ''}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.text, padding: 20, paddingBottom: 12 },
  map: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    minWidth: 160,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  calloutName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  calloutWings: { fontSize: 13, color: '#E8590C', fontWeight: '600', marginBottom: 4 },
  calloutVisitors: { fontSize: 12, color: '#666' },
});
