import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { GlucoseStatus } from '../types';

const DOT_COLORS: Record<GlucoseStatus, string> = {
  green: colors.green,
  yellow: colors.yellow,
  red: colors.red,
};

interface Props {
  dotColor: GlucoseStatus;
  value: string;
  meta: string;
}

export function TimelineItem({ dotColor, value, meta }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: DOT_COLORS[dotColor] }]} />
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'flex-start',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.text3,
    marginTop: 2,
  },
});
