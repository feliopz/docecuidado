import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, fontSize } from '../constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'mint' | 'sky';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  large?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const BG: Record<Variant, string> = {
  primary: colors.red,
  secondary: colors.peach,
  outline: colors.card,
  mint: colors.mint,
  sky: colors.sky,
};

const FG: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: '#C0392B',
  outline: colors.red,
  mint: '#1E8449',
  sky: '#2471A3',
};

export function Button({ title, onPress, variant = 'primary', large, disabled, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.btn,
        { backgroundColor: BG[variant] },
        variant === 'outline' && styles.outline,
        large && styles.large,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: FG[variant] },
          large && styles.largeText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  text: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  outline: {
    borderWidth: 2,
    borderColor: colors.red,
  },
  large: {
    paddingVertical: 20,
    borderRadius: radius.lg,
  },
  largeText: {
    fontSize: fontSize.lg,
  },
  disabled: {
    opacity: 0.5,
  },
});
