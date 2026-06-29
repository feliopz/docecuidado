import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

export const ICON_MAP = {
  'home': 'home-outline',
  'home-active': 'home',
  'chart': 'bar-chart-outline',
  'chart-active': 'bar-chart',
  'learn': 'school-outline',
  'learn-active': 'school',
  'profile': 'person-outline',
  'profile-active': 'person',
  'emergency': 'alert-circle',
  'glucose': 'water-outline',
  'glucose-active': 'water',
  'insulin': 'medkit-outline',
  'insulin-active': 'medkit',
  'meal': 'restaurant-outline',
  'meal-active': 'restaurant',
  'camera': 'camera-outline',
  'save': 'checkmark-circle-outline',
  'back': 'arrow-back',
  'warning': 'warning-outline',
  'warning-active': 'warning',
  'heart': 'heart-outline',
  'heart-active': 'heart',
  'clock': 'time-outline',
  'sunny': 'sunny-outline',
  'moon': 'moon-outline',
  'flash': 'flash-outline',
  'hourglass': 'hourglass-outline',
  'flag': 'flag-outline',
  'flag-active': 'flag',
  'quiz': 'help-circle-outline',
  'book': 'book-outline',
  'trophy': 'trophy-outline',
  'people': 'people-outline',
  'people-active': 'people',
  'add': 'add-circle-outline',
  'call': 'call-outline',
  'call-active': 'call',
  'medkit': 'medkit-outline',
  'ambulance': 'car-outline',
  'flame': 'flame-outline',
  'nutrition': 'nutrition-outline',
  'search': 'search-outline',
  'edit': 'create-outline',
  'share': 'share-social-outline',
  'clipboard': 'clipboard-outline',
  'trending': 'trending-up-outline',
  'calendar': 'calendar-outline',
  'checkmark': 'checkmark-circle',
  'close': 'close',
  'star': 'star-outline',
  'sparkles': 'sparkles-outline',
  'happy': 'happy-outline',
  'alert': 'alert-circle-outline',
  'sad': 'sad-outline',
  'thermometer': 'thermometer-outline',
  'trash': 'trash-outline',
  'male': 'male',
  'female': 'female',
  'cart': 'cart-outline',
  'person-add': 'person-add-outline',
  'help': 'help-circle-outline',
  'lock': 'lock-closed-outline',
  'logout': 'log-out-outline',
  'swap': 'swap-horizontal-outline',
  'filter': 'funnel-outline',
  'chevron-down': 'chevron-down',
  'chevron-up': 'chevron-up',
  'chevron-right': 'chevron-forward',
  'analytics': 'analytics-outline',
  'pulse': 'pulse-outline',
  'document': 'document-text-outline',
  'document-active': 'document-text',
  'shield': 'shield-checkmark-outline',
  'settings': 'settings-outline',
  'notifications': 'notifications-outline',
  'notifications-active': 'notifications',
  'link-off': 'unlink-outline',
  'list': 'list-outline',
} as const;

export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 24, color = colors.text }: IconProps) {
  const glyphName = ICON_MAP[name];
  return <Ionicons name={glyphName} size={size} color={color} />;
}
