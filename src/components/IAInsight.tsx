import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';
import Icon from './Icon';

interface Props {
  text: string;
  label?: string;
}

export function IAInsight({ text, label = 'Análise da Gotinha' }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Icon name="sparkles" size={13} color={colors.ia} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.iaBg,
    borderRadius: radius.md,
    padding: 14,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.ia,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ia,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
});
