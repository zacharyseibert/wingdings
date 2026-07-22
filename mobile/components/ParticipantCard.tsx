import { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, PanResponder, Animated } from 'react-native';
import { colors } from '../lib/colors';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// All badge definitions including hidden ones
const BADGE_DEFS: Record<string, { emoji: string; name: string; desc: string }> = {
  first_wing:   { emoji: '🍗', name: 'First Wing',    desc: 'Logged your first wings' },
  ten_club:     { emoji: '🔟', name: '10 Club',       desc: 'Eaten 10 wings total' },
  century:      { emoji: '💯', name: 'Century',       desc: 'Eaten 100 wings total' },
  five_hundred: { emoji: '🚀', name: '500 Club',      desc: 'Eaten 500 wings total' },
  one_thousand: { emoji: '👑', name: '1,000 Wings',   desc: 'Eaten 1,000 wings total' },
  five_thousand:{ emoji: '🌟', name: '5,000 Wings',   desc: 'Eaten 5,000 wings total' },
  big_session:  { emoji: '💥', name: 'Big Session',   desc: 'Ate 20+ wings in one sitting' },
  heavyweight:  { emoji: '🏋️', name: 'Heavyweight',   desc: 'Ate 50+ wings in one sitting' },
  glutton:      { emoji: '👹', name: 'The Glutton',   desc: 'Ate 100+ wings in one sitting' },
  food_blogger: { emoji: '📸', name: 'Food Blogger',  desc: 'Attached a photo to a log' },
  wing_tourist: { emoji: '📍', name: 'Wing Tourist',  desc: 'Logged from 3 different locations' },
  night_owl:    { emoji: '🌙', name: 'Night Owl',     desc: 'Logged wings after midnight' },
  early_bird:   { emoji: '🌅', name: 'Early Bird',    desc: 'Logged wings before 9am' },
  number_one:   { emoji: '🏆', name: '#1',            desc: 'Held the top leaderboard spot' },
  wing_mayor:   { emoji: '🦅', name: 'Wing Mayor',    desc: 'Logged wings at the same spot 5 times' },
  nice:         { emoji: '😏', name: 'Nice!',         desc: 'Reached exactly 69 wings' },
  blaze_it:     { emoji: '🌿', name: 'Blaze It',      desc: 'Reached exactly 420 wings' },
  jerkin_it:    { emoji: '🫙', name: "Jerkin' It",    desc: 'Logged wings with jerk in the notes' },
};

interface Props {
  userId: string | null;
  onClose: () => void;
}

export default function ParticipantCard({ userId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80 || g.vy > 0.5) {
        onClose();
        translateY.setValue(0);
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  useEffect(() => {
    if (!userId) return;
    translateY.setValue(0);
    setLoading(true);
    setProfile(null);
    fetch(`${API_URL}/api/user/${userId}/profile`)
      .then(r => r.json())
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const visible = !!userId;
  const user = profile?.user;
  const badges: { badge_key: string }[] = profile?.badges ?? [];
  const stats = profile?.stats;
  const name = user?.display_name || user?.username || '?';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
          <View style={styles.handle} />

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
          ) : !profile ? (
            <Text style={styles.error}>Couldn't load profile.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{name[0].toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.wings}>{(user?.total_wings ?? 0).toLocaleString()} 🍗</Text>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{stats?.entryCount ?? '—'}</Text>
                  <Text style={styles.statLbl}>Sessions</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxMid]}>
                  <Text style={styles.statVal}>{stats?.biggestSession ?? '—'}</Text>
                  <Text style={styles.statLbl}>Best Session</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{stats?.longestStreak ? `${stats.longestStreak}d` : '—'}</Text>
                  <Text style={styles.statLbl}>Longest Streak</Text>
                </View>
              </View>

              {/* Badges */}
              {badges.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Badges</Text>
                  <View style={styles.badgeGrid}>
                    {badges.map(b => {
                      const def = BADGE_DEFS[b.badge_key];
                      if (!def) return null;
                      return (
                        <View key={b.badge_key} style={styles.badgeCard}>
                          <Text style={styles.badgeEmoji}>{def.emoji}</Text>
                          <Text style={styles.badgeName}>{def.name}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {badges.length === 0 && (
                <Text style={styles.noBadges}>No badges yet 🫤</Text>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 48,
    maxHeight: '75%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 },
  error: { color: colors.textSecondary, textAlign: 'center', marginVertical: 32 },

  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.primary, fontWeight: 'bold', fontSize: 28 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  wings: { fontSize: 18, color: colors.primary, fontWeight: '600' },

  statsRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 24 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: colors.background },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statVal: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLbl: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    width: '30%',
  },
  badgeEmoji: { fontSize: 24, marginBottom: 4 },
  badgeName: { fontSize: 11, color: colors.text, fontWeight: '500', textAlign: 'center' },
  noBadges: { color: colors.textSecondary, textAlign: 'center', marginTop: 12, marginBottom: 24 },
});
