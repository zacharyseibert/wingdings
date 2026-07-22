import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../lib/colors';

interface Props {
  value: number | null;
  onChange: (rating: number | null) => void;
}

const STARS = [1, 2, 3, 4, 5];

export default function StarRating({ value, onChange }: Props) {
  function handlePress(starIndex: number, isHalf: boolean) {
    const tapped = starIndex + (isHalf ? 0.5 : 1);
    // Tapping the same value clears it
    if (value === tapped) {
      onChange(null);
    } else {
      onChange(tapped);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Rate these wings</Text>
      <View style={styles.stars}>
        {STARS.map((_, i) => {
          const filled = value !== null && value >= i + 1;
          const half = value !== null && value >= i + 0.5 && value < i + 1;
          return (
            <View key={i} style={styles.starWrap}>
              {/* Left half tap zone */}
              <TouchableOpacity
                style={styles.halfLeft}
                onPress={() => handlePress(i, true)}
                activeOpacity={0.7}
              />
              {/* Right half tap zone */}
              <TouchableOpacity
                style={styles.halfRight}
                onPress={() => handlePress(i, false)}
                activeOpacity={0.7}
              />
              {/* Star rendering */}
              <Text style={styles.starBase}>☆</Text>
              {(filled || half) && (
                <View style={[styles.starFill, half && { width: '50%' }]}>
                  <Text style={styles.starFilled}>★</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      {value !== null && (
        <Text style={styles.ratingText}>{value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} / 5</Text>
      )}
    </View>
  );
}

const STAR_SIZE = 40;

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 12 },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 4 },
  starWrap: { width: STAR_SIZE, height: STAR_SIZE, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  starBase: { fontSize: STAR_SIZE, color: colors.border, lineHeight: STAR_SIZE + 4, position: 'absolute' },
  starFill: { position: 'absolute', overflow: 'hidden', width: '100%', height: '100%', alignItems: 'flex-start', justifyContent: 'center' },
  starFilled: { fontSize: STAR_SIZE, color: '#F5A623', lineHeight: STAR_SIZE + 4 },
  halfLeft: { position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', zIndex: 1 },
  halfRight: { position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', zIndex: 1 },
  ratingText: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
});
