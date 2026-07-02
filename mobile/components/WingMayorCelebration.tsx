import { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../lib/colors';

const { width: W, height: H } = Dimensions.get('window');
const CONFETTI_COUNT = 60;
const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF922B', '#CC5DE8', '#FF6DD8'];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function ConfettiPiece({ delay }: { delay: number }) {
  const x = useRef(new Animated.Value(randomBetween(0, W))).current;
  const y = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = randomBetween(6, 12);
  const isCircle = Math.random() > 0.5;

  useEffect(() => {
    const duration = randomBetween(1800, 3200);
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, { toValue: H + 20, duration, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: randomBetween(-4, 4), duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.delay(duration - 600),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x as any,
        width: size,
        height: isCircle ? size : size * 1.6,
        borderRadius: isCircle ? size / 2 : 2,
        backgroundColor: color,
        opacity,
        transform: [
          { translateY: y },
          { rotate: rotate.interpolate({ inputRange: [-4, 4], outputRange: ['-720deg', '720deg'] }) },
        ],
      }}
    />
  );
}

interface Props {
  visible: boolean;
  locationName: string;
  onClose: () => void;
}

export default function WingMayorCelebration({ visible, locationName, onClose }: Props) {
  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Confetti */}
        {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
          <ConfettiPiece key={i} delay={i * 40} />
        ))}

        <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={styles.card}>
            <Text style={styles.icon}>🦅</Text>
            <Text style={styles.title}>Wing Mayor!</Text>
            <Text style={styles.subtitle}>
              You've been crowned the Wing Mayor of{'\n'}
              <Text style={styles.location}>{locationName}</Text>
            </Text>
            <Text style={styles.desc}>
              You've logged wings here 5 times. This spot is yours.
            </Text>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Own It 🦅</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD93D',
  },
  icon: { fontSize: 72, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '900', color: colors.text, marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 8, lineHeight: 22 },
  location: { fontWeight: '700', color: colors.text },
  desc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  button: {
    backgroundColor: '#FFD93D',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  buttonText: { color: '#000', fontSize: 17, fontWeight: '700' },
});
