import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, Image, TouchableOpacity,
  Modal, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLeaderboard, getMyStats } from '../../lib/wings';
import { supabase } from '../../lib/supabase';
import ImageViewer from '../../components/ImageViewer';
import EmojiPicker from '../../components/EmojiPicker';
import { colors } from '../../lib/colors';

const CACHE_KEY = 'wingdings:leaderboard_cache';

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

function Header({ globalStats, funStats, viewMode, isInCompetition, board, competitionId }: {
  globalStats: GlobalStats | null;
  funStats: FunStats | null;
  viewMode: 'competition' | 'global';
  isInCompetition: boolean;
  board: any[];
  competitionId: number | null;
}) {
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  async function openParticipants() {
    setShowParticipants(true);
    if (competitionId) {
      fetch(`${API_URL}/api/competition/${competitionId}/participants`)
        .then(r => r.json())
        .then(res => setParticipants(res.data ?? []))
        .catch(() => setParticipants(board));
    } else {
      setParticipants(board);
    }
  }

  const perPerson = globalStats && globalStats.participants > 0
    ? Math.round(globalStats.total / globalStats.participants).toLocaleString()
    : '—';

  const statsTitle = viewMode === 'competition' && isInCompetition ? 'Competition Stats' : 'Global Stats';

  return (
    <View>
      <Text style={styles.title}>🏆 Leaderboard</Text>
      <Text style={styles.sectionTitle}>{statsTitle}</Text>

      {/* Global stats */}
      <View style={styles.statsRow}>
        <View style={styles.globalCard}>
          <Text style={styles.globalNumber}>{globalStats ? globalStats.total.toLocaleString() : '—'}</Text>
          <Text style={styles.globalLabel}>🍗 Total Wings</Text>
        </View>
        <TouchableOpacity style={styles.globalCard} onPress={openParticipants}>
          <Text style={styles.globalNumber}>{globalStats ? globalStats.participants.toLocaleString() : '—'}</Text>
          <Text style={styles.globalLabel}>👥 Participants</Text>
        </TouchableOpacity>
        <View style={styles.globalCard}>
          <Text style={styles.globalNumber}>{perPerson}</Text>
          <Text style={styles.globalLabel}>📊 Per Person</Text>
        </View>
      </View>

      {/* Participants modal */}
      <Modal visible={showParticipants} transparent animationType="slide" onRequestClose={() => setShowParticipants(false)}>
        <TouchableOpacity style={styles2.overlay} activeOpacity={1} onPress={() => setShowParticipants(false)}>
          <TouchableOpacity activeOpacity={1} style={styles2.sheet}>
            <View style={styles2.handle} />
            <Text style={styles2.title}>👥 Participants</Text>
            <ScrollView>
              {participants.map((u, i) => (
                <View key={u.id} style={styles2.row}>
                  <Text style={styles2.rank}>{i + 1}</Text>
                  <View style={styles2.avatar}>
                    <Text style={styles2.avatarText}>{(u.display_name || u.username || '?')[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles2.name}>{u.display_name || u.username}</Text>
                  <Text style={styles2.wings}>{u.total_wings > 0 ? `${u.total_wings.toLocaleString()} 🍗` : 'No wings yet'}</Text>
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

function ViewModeToggle({ viewMode, onToggle, competition }: {
  viewMode: 'competition' | 'global';
  onToggle: () => void;
  competition: any;
}) {
  if (!competition) return null;

  return (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'competition' && styles.toggleButtonActive]}
        onPress={() => viewMode !== 'competition' && onToggle()}
      >
        <Text style={[styles.toggleText, viewMode === 'competition' && styles.toggleTextActive]}>
          🏆 {competition.name}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'global' && styles.toggleButtonActive]}
        onPress={() => viewMode !== 'global' && onToggle()}
      >
        <Text style={[styles.toggleText, viewMode === 'global' && styles.toggleTextActive]}>
          🌍 Global
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Footer({ recent, expandedEntry, setExpandedEntry, onViewImage, reactions, onReact, myUserId }: {
  recent: RecentEntry[];
  expandedEntry: number | null;
  setExpandedEntry: (i: number | null) => void;
  onViewImage: (uri: string) => void;
  reactions: Record<number, Record<string, string[]>>;
  onReact: (entryId: number, emoji: string) => void;
  myUserId: string | null;
}) {
  const [pickerEntryId, setPickerEntryId] = useState<number | null>(null);

  if (recent.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>⚡ Recent Activity</Text>
      <View style={styles.recentBox}>
        {recent.map((e: any, i) => {
          const name = e.users?.display_name || e.users?.username || 'Someone';
          const hasExtras = !!(e.photo_url || e.location_name || e.note);
          const isExpanded = expandedEntry === i;
          const entryReactions = e.id ? (reactions[e.id] ?? {}) : {};
          const reactionEntries = Object.entries(entryReactions);

          return (
            <View key={i} style={[styles.recentRow, i === recent.length - 1 && { borderBottomWidth: 0 }]}>
              <TouchableOpacity
                activeOpacity={hasExtras ? 0.7 : 1}
                onPress={() => hasExtras && setExpandedEntry(isExpanded ? null : i)}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
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
                      {e.note && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>💬 {e.note}</Text>}
                      {e.location_name && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>📍 {e.location_name}</Text>}
                      {e.photo_url && (
                        <TouchableOpacity onPress={() => onViewImage(e.photo_url!)}>
                          <Image source={{ uri: e.photo_url }} style={{ width: '100%', height: 160, borderRadius: 10, marginTop: 8 }} resizeMode="cover" />
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Reactions row */}
              {e.id && (
                <View style={styles.reactionsRow}>
                  {reactionEntries.map(([emoji, users]) => {
                    const isMine = myUserId ? users.includes(myUserId) : false;
                    return (
                      <TouchableOpacity
                        key={emoji}
                        style={[styles.reactionChip, isMine && styles.reactionChipMine]}
                        onPress={() => onReact(e.id, emoji)}
                      >
                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                        <Text style={[styles.reactionCount, isMine && styles.reactionCountMine]}>{users.length}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.reactionAdd} onPress={() => setPickerEntryId(e.id)}>
                    <Text style={styles.reactionAddText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <EmojiPicker
        visible={pickerEntryId !== null}
        onSelect={(emoji) => { if (pickerEntryId) onReact(pickerEntryId, emoji); }}
        onClose={() => setPickerEntryId(null)}
      />
    </>
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
  const [viewMode, setViewMode] = useState<'competition' | 'global'>('competition');
  const [reactions, setReactions] = useState<Record<number, Record<string, string[]>>>({});
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Show cached data immediately
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { board, globalStats, funStats, recent, competition: cachedComp } = JSON.parse(cached);
        if (board) { setBoard(board); setLoading(false); }
        if (globalStats) setGlobalStats(globalStats);
        if (funStats) setFunStats(funStats);
        if (recent) setRecent(recent);
        if (cachedComp) setCompetition(cachedComp);
      }

      // Get user's competition first
      const myStats = await getMyStats().catch(() => ({ competition: null }));
      const competitionId = myStats.competition?.id ?? null;
      setCompetition(myStats.competition);

      // Determine which view to show based on current mode and competition status
      const shouldShowCompetition = viewMode === 'competition' && competitionId !== null;
      const leaderboardId = shouldShowCompetition ? competitionId : null;

      const statsQuery = shouldShowCompetition ? `?competitionId=${competitionId}` : '';
      const [boardData, statsRes, funRes, recentRes] = await Promise.all([
        getLeaderboard(leaderboardId),
        fetch(`${API_URL}/api/stats${statsQuery}`).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/api/fun-stats${statsQuery}`).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/api/recent?limit=8`).then(r => r.json()).catch(() => null),
      ]);
      setBoard(boardData);
      if (statsRes) setGlobalStats(statsRes);
      if (funRes) setFunStats(funRes);
      if (recentRes?.data) {
        setRecent(recentRes.data);
        // Fetch reactions for recent entries
        const entryIds = recentRes.data.filter((e: any) => e.id).map((e: any) => e.id);
        if (entryIds.length > 0) {
          fetch(`${API_URL}/api/reactions?entryIds=${entryIds.join(',')}`)
            .then(r => r.json())
            .then(res => setReactions(res.data ?? {}))
            .catch(() => {});
        }
      }

      // Save to cache
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        board: boardData,
        globalStats: statsRes,
        funStats: funRes,
        recent: recentRes?.data ?? [],
        competition: myStats.competition,
      }));

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
  }, [viewMode]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('users').select('id').then(({ data }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        supabase.from('users').select('id').eq('auth_id', session.user.id).single()
          .then(({ data: u }) => { if (u) setMyUserId(u.id); });
      });
    });
  }, []);

  async function handleReact(entryId: number, emoji: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Optimistic update
    setReactions(prev => {
      const entryReactions = { ...(prev[entryId] ?? {}) };
      const users = entryReactions[emoji] ? [...entryReactions[emoji]] : [];
      if (myUserId && users.includes(myUserId)) {
        entryReactions[emoji] = users.filter(u => u !== myUserId);
        if (entryReactions[emoji].length === 0) delete entryReactions[emoji];
      } else {
        entryReactions[emoji] = myUserId ? [...users, myUserId] : users;
      }
      return { ...prev, [entryId]: entryReactions };
    });

    fetch(`${API_URL}/api/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ entryId, emoji }),
    }).catch(() => {});
  }

  const handleToggle = () => {
    setViewMode(viewMode === 'competition' ? 'global' : 'competition');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ViewModeToggle viewMode={viewMode} onToggle={handleToggle} competition={competition} />
      <FlatList
        data={board}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={<Header globalStats={globalStats} funStats={funStats} viewMode={viewMode} isInCompetition={!!competition} board={board} competitionId={competition?.id ?? null} />}
        ListFooterComponent={<Footer recent={recent} expandedEntry={expandedEntry} setExpandedEntry={setExpandedEntry} onViewImage={setViewingImage} reactions={reactions} onReact={handleReact} myUserId={myUserId} />}
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
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10, marginTop: 4 },
  empty: { color: colors.textSecondary, fontSize: 15 },

  // Global stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  globalCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  globalNumber: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  globalLabel: { color: colors.textSecondary, fontSize: 10, marginTop: 2, textAlign: 'center' },

  // Records
  recordsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    alignItems: 'center',
    gap: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  statLabel: { color: colors.textSecondary, fontSize: 9, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  statSub: { color: colors.textSecondary, fontSize: 10, textAlign: 'center' },

  // Leaderboard rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  medal: { fontSize: 24, width: 32, textAlign: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '500' },
  wingsBox: { alignItems: 'flex-end' },
  wingsNumber: { color: colors.primary, fontSize: 20, fontWeight: 'bold' },
  wingsLabel: { color: colors.textSecondary, fontSize: 11 },

  badgeRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  badgeEmoji: { fontSize: 14 },

  // Recent activity
  recentBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  recentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    shrink: 0,
  },
  recentAvatarText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  recentText: { flex: 1 },
  recentName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  recentWings: { color: colors.primary, fontSize: 14 },
  recentTime: { color: colors.textSecondary, fontSize: 12 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 42, paddingBottom: 8, paddingTop: 4 },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.borderLight,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  reactionChipMine: { backgroundColor: '#EDE9FE', borderColor: colors.accent },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  reactionCountMine: { color: colors.accent },
  reactionAdd: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, minWidth: 28,
  },
  reactionAddText: { fontSize: 16, color: colors.textSecondary },
  competitionBanner: {
    backgroundColor: colors.accent,
    borderBottomWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  competitionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
});

const styles2 = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40, maxHeight: '70%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  rank: { width: 24, color: colors.textSecondary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  wings: { color: colors.textSecondary, fontSize: 13 },
});
