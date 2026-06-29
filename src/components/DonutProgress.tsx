import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  /** 0–100 */
  pct: number;
  size?: number;
  color?: string;
  track?: string;
  label?: string;
  sub?: string;
}

/**
 * A proportional ring built from 60 radial ticks. No SVG dependency.
 * The first `pct%` of the ticks are colored, the rest use the track color —
 * so the fill is always exactly proportional to the value.
 */
export default function DonutProgress({
  pct,
  size = 120,
  color = colors.green,
  track = '#ECECEC',
  label,
  sub,
}: Props) {
  const total = 60;
  const clamped = Math.min(Math.max(pct, 0), 100);
  const filled = Math.round((clamped / 100) * total);
  const tickH = Math.round(size * 0.12);
  const radius = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: 3,
            height: tickH,
            borderRadius: 2,
            backgroundColor: i < filled ? color : track,
            transform: [
              { rotate: `${i * (360 / total)}deg` },
              { translateY: -(radius - tickH / 2 - 2) },
            ],
          }}
        />
      ))}
      <View style={styles.center}>
        {label != null && <Text style={[styles.label, { color }]}>{label}</Text>}
        {sub != null && <Text style={styles.sub}>{sub}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 24, fontWeight: '900' },
  sub: { fontSize: 11, color: colors.text3, marginTop: 2 },
});
