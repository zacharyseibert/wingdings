import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';

interface Badge {
  key: string;
  emoji: string;
  name: string;
  desc: string;
}

interface Props {
  badges: Badge[];
  onClose: () => void;
}

export default function BadgeCelebration({ badges, onClose }: Props) {
  useEffect(() => {
    if (badges.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [badges]);

  if (!badges.length) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={styles.card}>
            <Text style={styles.title}>🎉 New Badge{badges.length > 1 ? 's' : ''}!</Text>

            {badges.map((badge, i) => (
              <View key={i} style={styles.badgeRow}>
                <Text style={styles.emoji}>{badge.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{badge.name}</Text>
                  <Text style={styles.desc}>{badge.desc}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Sweet! 🍗</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  card: {
    backgroundColor: '#2A1A10',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E8722A',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5E6D3',
    textAlign: 'center',
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#1A0F0A',
    borderRadius: 12,
  },
  emoji: { fontSize: 40 },
  name: { fontSize: 18, fontWeight: '600', color: '#F5E6D3', marginBottom: 2 },
  desc: { fontSize: 14, color: '#78716c' },
  button: {
    backgroundColor: '#E8722A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
