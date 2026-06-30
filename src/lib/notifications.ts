import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getChild } from './store';

const PREFS_KEY = 'dc:notifications_enabled';
const CHANNEL_ID = 'glucose-reminders';

/** Horários relevantes para checagem de glicemia (DM1). */
export const GLUCOSE_REMINDER_SLOTS = [
  { id: 'cafe', hour: 7, minute: 0, label: 'café da manhã' },
  { id: 'pre_almoco', hour: 11, minute: 30, label: 'antes do almoço' },
  { id: 'pos_almoco', hour: 14, minute: 0, label: 'após o almoço' },
  { id: 'pre_jantar', hour: 18, minute: 0, label: 'antes do jantar' },
  { id: 'noite', hour: 21, minute: 0, label: 'antes de dormir' },
] as const;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Canal Android — deve existir antes de agendar. */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lembretes de glicemia',
    description: 'Lembretes gentis para registrar a glicemia da criança nos momentos do dia.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 120, 60, 120],
    lightColor: '#A8D8B9',
    sound: 'default',
  });
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PREFS_KEY);
  return val === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, String(enabled));
  if (enabled) {
    await scheduleGlucoseReminders();
  } else {
    await cancelAllReminders();
  }
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Solicita permissão do SO e agenda lembretes se aceito. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  await ensureNotificationChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  await setNotificationsEnabled(true);
  return true;
}

function buildMessage(childName: string, slotLabel: string): { title: string; body: string } {
  const name = childName || 'sua criança';
  return {
    title: '💧 Gotinha do Cuidado',
    body: `Ei, como está a glicemia de ${name} agora? (${slotLabel}) Registre agora mesmo!`,
  };
}

/** Cancela todos os lembretes agendados. */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Agenda lembretes diários nos horários-chave. */
export async function scheduleGlucoseReminders(): Promise<void> {
  const enabled = await areNotificationsEnabled();
  if (!enabled) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await ensureNotificationChannel();
  await cancelAllReminders();

  const child = await getChild();
  const childName = child?.name ?? '';

  for (const slot of GLUCOSE_REMINDER_SLOTS) {
    const { title, body } = buildMessage(childName, slot.label);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { screen: '/glicemia', slot: slot.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: slot.hour,
        minute: slot.minute,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });
  }
}

/** Reagenda quando o nome da criança ativa muda. */
export async function refreshRemindersIfEnabled(): Promise<void> {
  if (await areNotificationsEnabled()) {
    await scheduleGlucoseReminders();
  }
}

/** Configura listener para abrir tela de glicemia ao tocar na notificação. */
export function addNotificationResponseListener(
  onNavigate: (screen: string) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const screen = response.notification.request.content.data?.screen;
    if (typeof screen === 'string') onNavigate(screen);
  });
}

/** Listener quando notificação chega com app aberto. */
export function addNotificationReceivedListener(
  onReceive: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(onReceive);
}

