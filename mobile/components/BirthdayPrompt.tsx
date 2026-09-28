import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(1);
  const [saving, setSaving] = useState(false);

  function handleMonthChange(v: number) {
    setMonth(v);
    if (day > daysInMonth(v)) setDay(1);
  }

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
            <Picker
              selectedValue={month}
              onValueChange={handleMonthChange}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {MONTHS.map((m, i) => <Picker.Item key={m} label={m} value={i} />)}
            </Picker>
            <Picker
              selectedValue={day}
              onValueChange={setDay}
              style={[styles.picker, styles.pickerDay]}
              itemStyle={styles.pickerItem}
            >
              {Array.from({ length: daysInMonth(month) }, (_, i) => i + 1).map(d => (
                <Picker.Item key={d} label={String(d)} value={d} />
              ))}
            </Picker>
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
  sub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 8, lineHeight: 20 },
  pickers: { flexDirection: 'row', width: '100%', marginBottom: 16 },
  picker: { flex: 2 },
  pickerDay: { flex: 1 },
  pickerItem: { fontSize: 18, color: colors.text },
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
