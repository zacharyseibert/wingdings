import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../lib/colors';

interface Props {
  tag: any;
  submitting: boolean;
  onConfirm: (amount: number) => void;
  onDecline: () => void;
  onLater: () => void;
}

// A plain overlay rather than a Modal, because iOS drops a Modal presented while another is open.
export default function TagInvite({ tag, submitting, onConfirm, onDecline, onLater }: Props) {
  const [text, setText] = useState('');

  useEffect(() => { setText(''); }, [tag.id]);

  const name = tag.tagger?.display_name || tag.tagger?.username || 'Someone';
  const location = tag.entry?.location_name;
  const amount = parseInt(text, 10);
  const valid = amount > 0;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🍗</Text>
        <Text style={styles.title}>{name} tagged you</Text>
        <Text style={styles.sub}>{location ? `at ${location}. ` : ''}How many did you eat?</Text>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.primary, !valid && styles.primaryDisabled]}
          disabled={!valid || submitting}
          onPress={() => onConfirm(amount)}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryText}>{valid ? `Log ${amount} Wing${amount === 1 ? '' : 's'}` : 'Log Wings'}</Text>}
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity onPress={onLater} disabled={submitting} style={styles.secondary}>
            <Text style={styles.secondaryText}>Later</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDecline} disabled={submitting} style={styles.secondary}>
            <Text style={styles.secondaryText}>I wasn't there</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, alignItems: 'center' },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  sub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 8 },
  input: { fontSize: 48, fontWeight: 'bold', color: colors.primary, textAlign: 'center', minWidth: 120, marginBottom: 12 },
  primary: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center' },
  primaryDisabled: { backgroundColor: colors.border },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  secondary: { padding: 10 },
  secondaryText: { color: colors.textSecondary, fontSize: 14 },
});
