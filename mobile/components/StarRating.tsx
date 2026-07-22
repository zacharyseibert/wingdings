import { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { colors } from '../lib/colors';

interface Props {
  value: number | null;
  onChange: (rating: number | null) => void;
}

const STAR_SIZE = 40;
const GAP = 6;
const STARS = 5;
const TOTAL_WIDTH = STARS * STAR_SIZE + (STARS - 1) * GAP;

function ratingFromX(x: number): number | null {
  if (x <= 0) return null;
  const clamped = Math.min(x, TOTAL_WIDTH);
  const raw = (clamped / TOTAL_WIDTH) * STARS;
  const snapped = Math.round(raw * 2) / 2;
  return Math.max(0.5, Math.min(5, snapped));
}

function StarDisplay({ value }: { value: number | null }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: STARS }).map((_, i) => {
        const filled = value !== null && value >= i + 1;
        const half = value !== null && value >= i + 0.5 && value < i + 1;
        const clipWidth = filled ? STAR_SIZE : half ? STAR_SIZE / 2 : 0;
        return (
          <View key={i} style={styles.starWrap}>
            {/* Base empty star */}
            <Text style={styles.starEmpty}>☆</Text>
            {/* Filled overlay, clipped to show full or half */}
            {clipWidth > 0 && (
              <View style={[styles.starClip, { width: clipWidth }]}>
                <Text style={styles.starFull}>★</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function StarRating({ value, onChange }: Props) {
  const containerRef = useRef<View>(null);
  const offsetX = useRef(0);
  const [active, setActive] = useState(false);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      containerRef.current?.measure((_fx, _fy, _w, _h, px) => {
        offsetX.current = px;
      });
      const x = e.nativeEvent.pageX - offsetX.current - 10; // subtract padding
      onChange(ratingFromX(x));
      setActive(true);
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.pageX - offsetX.current - 10; // subtract padding
      onChange(ratingFromX(x));
    },
    onPanResponderRelease: () => setActive(false),
    onPanResponderTerminate: () => setActive(false),
  })).current;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {value !== null
          ? `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} / 5 ★`
          : 'Rate these wings'}
      </Text>
      <View
        ref={containerRef}
        style={[styles.touchArea, active && styles.touchAreaActive]}
        {...panResponder.panHandlers}
      >
        <StarDisplay value={value} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 12 },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  touchArea: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  touchAreaActive: {
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  stars: { flexDirection: 'row', gap: GAP },
  starWrap: {
    width: STAR_SIZE,
    height: STAR_SIZE,
    position: 'relative',
  },
  starEmpty: {
    position: 'absolute',
    left: 0,
    width: STAR_SIZE,
    textAlign: 'center',
    fontSize: STAR_SIZE - 2,
    lineHeight: STAR_SIZE,
    color: colors.border,
  },
  starClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: STAR_SIZE,
    overflow: 'hidden',
  },
  starFull: {
    width: STAR_SIZE,
    textAlign: 'center',
    fontSize: STAR_SIZE - 2,
    lineHeight: STAR_SIZE,
    color: '#F5A623',
  },
});
