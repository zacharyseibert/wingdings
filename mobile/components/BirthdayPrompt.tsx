import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors } from '../lib/colors';
import { supabase } from '../lib/supabase';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(month: number) {
  return new Date(2001, month + 1, 0).getDate();
}

interface Props {
  userId: string;
  onDone: () => void;
}

export default function BirthdayPrompt({ userId, onDone }: Props) {
  const [month, setMonth] = useState(0); // 0-indexed
  const [day, setDay] = useState(1);
  const [saving, setSaving] = useState(false);

  function prevMonth() {
    const m = (month - 1 + 12) % 12;
    setMonth(m);
    if (day > daysInMonth(m)) setDay(daysInMonth(m));
  }
  function nextMonth() {
    const m = (month + 1) % 12;
    setMonth(m);
    if (day > daysInMonth(m)) setDay(daysInMonth(m));
  }
  function prevDay() { setDay(d => d === 1 ? daysInMonth(month) : d - 1); }
  function nextDay() { setDay(d => d === daysInMonth(month) ? 1 : d + 1); }

  async function handleSave() {
    setSaving(true);
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    await supabase.from('users').update({ birthday: `${mm}-${dd}` }).eq('id', userId);
    onDone();
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎂</Text>
          <Text style={styles.title}>When's your birthday?</Text>
          <Text style={styles.sub}>We'll give you a special badge when you log wings on your big day.</Text>

          <View style={styles.pickers}>
            <View style={styles.pickerCol}>
              <TouchableOpacity style={styles.arrow} onPress={prevMonth}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.pickerVal}>{MONTHS[month]}</Text>
              <TouchableOpacity style={styles.arrow} onPress={nextMonth}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.pickerCol, styles.pickerColDay]}>
              <TouchableOpacity style={styles.arrow} onPress={prevDay}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.pickerVal}>{day}</Text>
              <TouchableOpacity style={styles.arrow} onPress={nextDay}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Birthday 🎉'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={onDone}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  pickers: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 24 },
  pickerCol: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  pickerColDay: { flex: 1 },
  arrow: { padding: 4 },
  arrowText: { fontSize: 22, color: colors.primary, fontWeight: '600' },
  pickerVal: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center', flex: 1 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { paddingVertical: 8 },
  skipBtnText: { color: colors.textSecondary, fontSize: 14 },
});
