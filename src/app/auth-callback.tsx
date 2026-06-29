import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { colors } from '../constants/theme';

async function handleAuthUrl(url: string): Promise<void> {
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';
  const params = new URLSearchParams(hash || query);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return;
  }

  const code = params.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
}

export default function AuthCallback() {
  useEffect(() => {
    let sub: { remove: () => void } | undefined;

    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) await handleAuthUrl(initial);

      sub = Linking.addEventListener('url', ({ url }) => {
        handleAuthUrl(url).finally(() => router.replace('/(tabs)'));
      });

      router.replace('/(tabs)');
    })();

    return () => sub?.remove();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.red} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
});
