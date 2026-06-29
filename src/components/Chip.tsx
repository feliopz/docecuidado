import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import Icon, { IconName } from './Icon';

interface Props {
  icon?: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ icon, label, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      {icon ? (
        <Icon
          name={icon as IconName}
          size={16}
          color={selected ? colors.red : colors.text2}
        />
      ) : null}
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  selected: {
    borderColor: colors.red,
    backgroundColor: '#FDEDEC',
  },
  text: {
    fontSize: 14,
    color: colors.text,
  },
  textSelected: {
    color: colors.red,
    fontWeight: '600',
  },
});
