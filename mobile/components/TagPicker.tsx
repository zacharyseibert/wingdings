import { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getCompetitionMembers } from '../lib/wings';
import { colors } from '../lib/colors';

interface Props {
  visible: boolean;
  competitionId: number;
  myUserId: string | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}

export default function TagPicker({ visible, competitionId, myUserId, selectedIds, onChange, onClose }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getCompetitionMembers(competitionId)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [visible, competitionId]);

  function toggle(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  }

  const others = members.filter(m => m.id !== myUserId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Who ate with you?</Text>
          <Text style={styles.sub}>They'll get a notification to add their own wings.</Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
          ) : others.length === 0 ? (
            <Text style={styles.empty}>Couldn't load HWFFL members.</Text>
          ) : (
            <ScrollView>
              {others.map(m => {
                const selected = selectedIds.includes(m.id);
                const name = m.display_name || m.username || '?';
                return (
                  <TouchableOpacity key={m.id} style={styles.row} onPress={() => toggle(m.id)} activeOpacity={0.7}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.name}>{name}</Text>
                    <View style={[styles.check, selected && styles.checkOn]}>
                      {selected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>{selectedIds.length ? `Tag ${selectedIds.length}` : 'Done'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, maxHeight: '75%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginVertical: 32 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  done: { backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 14 },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
