import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, Image, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLeaderboard, getMyStats } from '../../lib/wings';
import ImageViewer from '../../components/ImageViewer';

const MEDALS = ['🥇', '🥈', '🥉'];
const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface GlobalStats {
  total: number;
  participants: number;
}

interface FunStats {
  biggestSession: { amount: number; users: { display_name: string; username: string } } | null;
  mostActiveDay: { day: string; total: number } | null;
  longestStreak: { name: string; streak: number } | null;
}

interface RecentEntry {
  amount: number;
  created_at: string;
  photo_url?: string | null;
  location_name?: string | null;
  note?: string | null;
  users: { display_name: string; username: string; avatar_url: string | null };
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function Header({ globalStats, funStats, recent, expandedEntry, setExpandedEntry, onViewImage }: {
  globalStats: GlobalStats | null;
  funStats: FunStats | null;
  recent: RecentEntry[];
  expandedEntry: number | null;
  setExpandedEntry: (i: number | null) => void;
  onViewImage: (uri: string) => void;
}) {
  const perPerson = globalStats && globalStats.participants > 0
    ? Math.round(globalStats.total / globalStats.participants).toLocaleString()
    : '—';

  return (
    <View>
      <Text style={styles.title}>🏆 Leaderboard</Text>

      {/* Global stats */}
      <View style={styles.statsRow}>
        <View style={styles.globalCard}>
          <Text style={styles.globalNumber}>{globalStats ? globalStats.total.toLocaleString() : '—'}</Text>
          <Text style={styles.globalLabel}>🍗 Total Wings</Text>
        </View>
        <View style={styles.globalCard}>
          <Text style={styles.globalNumber}>{globalStats ? globalStats.participants.toLocaleString() : '—'}</Text>
          <Text style={styles.globalLabel}>👥 Participants</Text>
        </View>
        <View style={styles.globalCard}>
          <Text style={styles.globalNumber}>{perPerson}</Text>
          <Text style={styles.globalLabel}>📊 Per Person</Text>
        </View>
      </View>

      {/* Recent activity */}
      {recent.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⚡ Recent Activity</Text>
          <View style={styles.recentBox}>
            {recent.map((e, i) => {
              const name = e.users?.display_name || e.users?.username || 'Someone';
              const hasExtras = !!(e.photo_url || e.location_name || e.note);
              const isExpanded = expandedEntry === i;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={hasExtras ? 0.7 : 1}
                  onPress={() => hasExtras && setExpandedEntry(isExpanded ? null : i)}
                  style={[styles.recentRow, i === recent.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.recentAvatar}>
                    <Text style={styles.recentAvatarText}>{name[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.recentText, { flex: 1 }]}>
                        <Text style={styles.recentName}>{name}</Text>
                        <Text style={styles.recentWings}> ate {e.amount} wings</Text>
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {e.note && <Text style={{ fontSize: 12 }}>💬</Text>}
                        {e.photo_url && <Text style={{ fontSize: 12 }}>📷</Text>}
                        {e.location_name && <Text style={{ fontSize: 12 }}>📍</Text>}
                        <Text style={styles.recentTime}>{timeAgo(e.created_at)}</Text>
                      </View>
                    </View>
                    {isExpanded && (
                      <>
                        {e.note && (
                          <Text style={{ color: '#78716c', fontSize: 12, marginTop: 4 }}>💬 {e.note}</Text>
                        )}
                        {e.location_name && (
                          <Text style={{ color: '#78716c', fontSize: 12, marginTop: 4 }}>📍 {e.location_name}</Text>
                        )}
                        {e.photo_url && (
                          <TouchableOpacity onPress={() => onViewImage(e.photo_url!)}>
                            <Image
                              source={{ uri: e.photo_url }}
                              style={{ width: '100%', height: 160, borderRadius: 10, marginTop: 8 }}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Records */}
      <Text style={styles.sectionTitle}>📈 Records</Text>
      <View style={styles.recordsRow}>
        <StatCard
          emoji="💥"
          label="Biggest Session"
          value={funStats?.biggestSession ? `${funStats.biggestSession.amount}` : '—'}
          sub={funStats?.biggestSession
            ? `${funStats.biggestSession.users?.display_name || funStats.biggestSession.users?.username} wings`
            : undefined}
        />
        <StatCard
          emoji="📅"
          label="Most Active Day"
          value={funStats?.mostActiveDay?.day ?? '—'}
          sub={funStats?.mostActiveDay ? `${funStats.mostActiveDay.total} wings` : undefined}
        />
        <StatCard
          emoji="🔥"
          label="Longest Streak"
          value={funStats?.longestStreak ? `${funStats.longestStreak.streak}d` : '—'}
          sub={funStats?.longestStreak?.name ?? undefined}
        />
      </View>

      <Text style={styles.sectionTitle}>🥇 Top 10</Text>
    </View>
  );
}

function CompetitionBanner({ competition }: { competition: any }) {
  if (!competition) return null;
  return (
    <View style={styles.competitionBanner}>
      <Text style={styles.competitionText}>🏆 {competition.name}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [funStats, setFunStats] = useState<FunStats | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [userBadges, setUserBadges] = useState<Record<string, any[]>>({});
  const [competition, setCompetition] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      // Get user's competition first
      const myStats = await getMyStats().catch(() => ({ competition: null }));
      const competitionId = myStats.competition?.id ?? null;
      setCompetition(myStats.competition);

      const [boardData, statsRes, funRes, recentRes] = await Promise.all([
        getLeaderboard(competitionId),
        fetch(`${API_URL}/api/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/api/fun-stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/api/recent?limit=8`).then(r => r.json()).catch(() => null),
      ]);
      setBoard(boardData);
      if (statsRes) setGlobalStats(statsRes);
      if (funRes) setFunStats(funRes);
      if (recentRes?.data) setRecent(recentRes.data);

      // Fetch recent badges for leaderboard users (non-blocking)
      if (boardData.length > 0) {
        const userIds = boardData.map((u: any) => u.id);
        fetch(`${API_URL}/api/badges/recent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds }),
        })
          .then(r => r.json())
          .then(res => setUserBadges(res.data ?? {}))
          .catch(() => {});
      }
    } catch (err: any) {
      console.error('[leaderboard]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
      <CompetitionBanner competition={competition} />
      <FlatList
        data={board}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#E8722A" />}
        ListHeaderComponent={<Header globalStats={globalStats} funStats={funStats} recent={recent} expandedEntry={expandedEntry} setExpandedEntry={setExpandedEntry} onViewImage={setViewingImage} />}
        ListEmptyComponent={<Text style={styles.empty}>No wings logged yet!</Text>}
        renderItem={({ item, index }) => {
          const name = item.display_name || item.username || 'Unknown';
          const medal = MEDALS[index] ?? `${index + 1}`;
          const badges = userBadges[item.id] ?? [];
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
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                {badges.length > 0 && (
                  <View style={styles.badgeRow}>
                    {badges.map((b, i) => (
                      <Text key={i} style={styles.badgeEmoji}>{b.emoji}</Text>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.wingsBox}>
                <Text style={styles.wingsNumber}>{item.total_wings.toLocaleString()}</Text>
                <Text style={styles.wingsLabel}>wings</Text>
              </View>
            </View>
          );
        }}
      />
      <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0F0A' },
  list: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#F5E6D3', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#F5E6D3', marginBottom: 10, marginTop: 4 },
  empty: { color: '#78716c', fontSize: 15 },

  // Global stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  globalCard: {
    flex: 1,
    backgroundColor: '#2A1A10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3D2618',
    padding: 12,
    alignItems: 'center',
  },
  globalNumber: { fontSize: 22, fontWeight: 'bold', color: '#E8722A' },
  globalLabel: { color: '#78716c', fontSize: 10, marginTop: 2, textAlign: 'center' },

  // Records
  recordsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#2A1A10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3D2618',
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#F5E6D3' },
  statLabel: { color: '#78716c', fontSize: 9, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  statSub: { color: '#78716c', fontSize: 10, textAlign: 'center' },

  // Leaderboard rows
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

  badgeRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  badgeEmoji: { fontSize: 14 },

  // Recent activity
  recentBox: {
    backgroundColor: '#2A1A10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3D2618',
    marginBottom: 20,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3D2618',
    gap: 10,
  },
  recentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#3D2618',
    alignItems: 'center', justifyContent: 'center',
    shrink: 0,
  },
  recentAvatarText: { color: '#E8722A', fontWeight: 'bold', fontSize: 13 },
  recentText: { flex: 1 },
  recentName: { color: '#F5E6D3', fontWeight: '600', fontSize: 14 },
  recentWings: { color: '#E8722A', fontSize: 14 },
  recentTime: { color: '#78716c', fontSize: 12 },
  competitionBanner: {
    backgroundColor: '#2A1A10',
    borderBottomWidth: 2,
    borderBottomColor: '#E8722A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  competitionText: {
    color: '#F5E6D3',
    fontSize: 14,
    fontWeight: '600',
  },
});
