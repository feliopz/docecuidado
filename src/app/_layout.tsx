import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ensureNotificationChannel,
  refreshRemindersIfEnabled,
  addNotificationResponseListener,
} from '../lib/notifications';
import { flushLogs, logEvent } from '../lib/log';

export default function RootLayout() {
  useEffect(() => {
    ensureNotificationChannel();
    refreshRemindersIfEnabled();
    logEvent('app.open', { area: 'app' });
    flushLogs(); // drain any logs buffered while offline last session
    const sub = addNotificationResponseListener(screen => {
      router.push(screen as '/glicemia');
    });
    // Retry the flush whenever the app returns to the foreground (likely back online).
    const appSub = AppState.addEventListener('change', state => {
      if (state === 'active') flushLogs();
    });
    return () => { sub.remove(); appSub.remove(); };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFF5EE' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="glicemia" />
        <Stack.Screen name="insulina" />
        <Stack.Screen name="nutricao" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="editar-perfil" />
        <Stack.Screen name="relatorio" />
        <Stack.Screen name="nova-crianca" />
        <Stack.Screen name="conta" />
        <Stack.Screen name="crise" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
