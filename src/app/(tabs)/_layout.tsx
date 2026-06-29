import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { colors } from '../../constants/theme';
import { getAccountType } from '../../lib/store';
import { AccountType } from '../../types';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  useEffect(() => {
    getAccountType().then(setAccountType);
  }, []);

  const isMedico = accountType === 'medico';
  // Hide the opposite role's screens from the tab bar with href: null.
  const hideForMedico = isMedico ? null : undefined;
  const showForMedico = isMedico ? undefined : null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            height: tabBarHeight,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 8,
          },
          tabBarActiveTintColor: colors.red,
          tabBarInactiveTintColor: '#95A5A6',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        {/* ── Responsável / Cuidador tabs ───────────────────────── */}
        <Tabs.Screen
          name="index"
          options={{
            href: hideForMedico,
            title: 'Início',
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'home-active' : 'home'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="diario"
          options={{
            href: hideForMedico,
            title: 'Diário',
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'chart-active' : 'chart'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="receitas"
          options={{
            href: hideForMedico,
            title: 'Receitas',
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'meal-active' : 'meal'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="aprender"
          options={{
            href: hideForMedico,
            title: 'Aprender',
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'learn-active' : 'learn'} size={22} color={color} />
            ),
          }}
        />

        {/* ── Médico (professional) tabs ────────────────────────── */}
        <Tabs.Screen
          name="pacientes"
          options={{
            href: showForMedico,
            title: 'Pacientes',
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'people-active' : 'people'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="dados"
          options={{
            href: showForMedico,
            title: 'Dados',
            tabBarIcon: ({ color }) => <Icon name="analytics" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="relatorios"
          options={{
            href: showForMedico,
            title: 'Relatórios',
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'document-active' : 'document'} size={22} color={color} />
            ),
          }}
        />

        {/* ── Shared ────────────────────────────────────────────── */}
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'profile-active' : 'profile'} size={22} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Emergency FAB — not shown for doctors (professional view) */}
      {!isMedico && (
        <TouchableOpacity
          style={[styles.fab, { bottom: tabBarHeight + 12 }]}
          onPress={() => router.push('/crise')}
          activeOpacity={0.85}
        >
          <Icon name="emergency" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 100,
  },
});
