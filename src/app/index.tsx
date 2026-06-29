import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { isOnboarded } from '../lib/store';

export default function Index() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const done = await isOnboarded();
      router.replace(done ? '/(tabs)' : '/onboarding');
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Image
        source={require('../assets/loading.png')}
        style={styles.mascot}
        resizeMode="contain"
        accessibilityLabel="Gotinha do Cuidado"
      />
      <Text style={styles.title}>Doce Cuidado</Text>
      <Text style={styles.subtitle}>Cuidando com carinho</Text>
      <ActivityIndicator size="small" color={colors.mint2} style={styles.loader} />
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
  mascot: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text2,
    marginTop: 4,
  },
  loader: {
    marginTop: 28,
  },
});
