import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  SafeAreaView, RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { getLeaderboard } from '../../lib/wings';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getLeaderboard();
    setBoard(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#E8722A" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={board}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#E8722A" />}
        ListHeaderComponent={<Text style={styles.title}>🏆 Leaderboard</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No wings logged yet!</Text>}
        renderItem={({ item, index }) => {
          const name = item.display_name || item.username || 'Unknown';
          const medal = MEDALS[index] ?? `${index + 1}`;
          return (
            <View style={styles.row}>
              <Text style={styles.medal}>{medal}</Text>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              <View style={styles.wingsBox}>
                <Text style={styles.wingsNumber}>{item.total_wings.toLocaleString()}</Text>
                <Text style={styles.wingsLabel}>wings</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0F0A' },
  list: { padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F5E6D3', marginBottom: 20 },
  empty: { color: '#78716c', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A10',
    borderWidth: 1,
    borderColor: '#3D2618',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  medal: { fontSize: 24, width: 32, textAlign: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: '#3D2618', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#E8722A', fontWeight: 'bold', fontSize: 16 },
  name: { flex: 1, color: '#F5E6D3', fontSize: 16, fontWeight: '500' },
  wingsBox: { alignItems: 'flex-end' },
  wingsNumber: { color: '#E8722A', fontSize: 20, fontWeight: 'bold' },
  wingsLabel: { color: '#78716c', fontSize: 11 },
});
