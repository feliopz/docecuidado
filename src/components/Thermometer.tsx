import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, fontSize } from '../constants/theme';
import { GlucoseStatus, getGlucoseIcon, getGlucoseLabel } from '../types';
import Icon, { IconName } from './Icon';

const BG: Record<GlucoseStatus, string> = {
  green: '#D4EDDA',
  yellow: '#FEF9E7',
  red: '#FDEDEC',
};

const ICON_COLOR: Record<GlucoseStatus, string> = {
  green: colors.green,
  yellow: colors.yellow,
  red: colors.red,
};

interface Props {
  value: number;
  status: GlucoseStatus;
  time?: string;
  recordedBy?: string;
}

export function Thermometer({ value, status, time, recordedBy }: Props) {
  return (
    <View style={[styles.container, { backgroundColor: BG[status] }]}>
      <Icon name={getGlucoseIcon(status) as IconName} size={64} color={ICON_COLOR[status]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>mg/dL</Text>
      {time ? (
        <Text style={styles.time}>
          {time}
          {recordedBy ? ` · por ${recordedBy}` : ''}
        </Text>
      ) : null}
      <Text style={styles.label}>{getGlucoseLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    marginBottom: 12,
    gap: 4,
  },
  value: {
    fontSize: fontSize.giant,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  unit: {
    fontSize: fontSize.md,
    color: colors.text2,
  },
  time: {
    fontSize: 13,
    color: colors.text3,
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    color: colors.text2,
    marginTop: 2,
    fontWeight: '600',
  },
});
