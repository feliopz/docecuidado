import { useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors, fontSize } from '../constants/theme';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = VISIBLE_ITEMS * ITEM_HEIGHT;

export interface ScrollPickerProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  color?: string;
}

export default function ScrollPicker({
  min,
  max,
  step = 5,
  value,
  onChange,
  label,
  color = colors.red,
}: ScrollPickerProps) {
  const scrollRef = useRef<ScrollView>(null);

  const data = useMemo(() => {
    const items: number[] = [];
    for (let i = min; i <= max; i += step) items.push(i);
    return items;
  }, [min, max, step]);

  const selectedIndex = useMemo(() => {
    const idx = data.indexOf(value);
    if (idx >= 0) return idx;
    let closest = 0;
    let minDiff = Math.abs(data[0] - value);
    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs(data[i] - value);
      if (diff < minDiff) { minDiff = diff; closest = i; }
    }
    return closest;
  }, [data, value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    }, 120);
    return () => clearTimeout(timer);
  }, [selectedIndex]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.max(0, Math.min(Math.round(offsetY / ITEM_HEIGHT), data.length - 1));
      if (data[index] !== value) onChange(data[index]);
    },
    [data, value, onChange],
  );

  const paddingVertical = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.listWrapper}>
        <View style={[styles.selectionIndicator, { borderColor: color }]} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentContainerStyle={{ paddingVertical }}
          nestedScrollEnabled
        >
          {data.map((item, index) => {
            const distance = Math.abs(index - selectedIndex);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25;
            const isSelected = index === selectedIndex;
            return (
              <View key={item} style={[styles.item, { opacity }]}>
                <Text
                  style={[
                    styles.itemText,
                    isSelected && { color, fontSize: fontSize.xl, fontWeight: '700' },
                  ]}
                >
                  {item}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  label: {
    fontSize: 13,
    color: colors.text2,
    marginBottom: 8,
    fontWeight: '500',
  },
  listWrapper: {
    height: CONTAINER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    width: 100,
  },
  selectionIndicator: {
    position: 'absolute',
    top: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    zIndex: 1,
    pointerEvents: 'none',
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  itemText: {
    fontSize: fontSize.lg,
    color: colors.text2,
    fontWeight: '500',
  },
});
