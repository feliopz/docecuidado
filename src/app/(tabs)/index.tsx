import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../../constants/theme';
import { Card } from '../../components/Card';
import { Thermometer } from '../../components/Thermometer';
import { IAInsight } from '../../components/IAInsight';
import { TimelineItem } from '../../components/TimelineItem';
import ChildSwitcher from '../../components/ChildSwitcher';
import Icon, { IconName } from '../../components/Icon';
import { getChild, getLinkedChildren, getActiveChildId, getAccountType, LinkedChild } from '../../lib/store';
import { AccountType } from '../../types';
import {
  fetchGlucoseReadingsDB,
  fetchInsulinLogsDB,
  fetchMealsDB,
} from '../../lib/supabase-db';
import { shouldPromptAuth } from '../../lib/auth';
import { Child, GlucoseReading, InsulinLog, Meal, getGlucoseStatus, INSULIN_LABELS, MOMENT_LABELS, InsulinType, MealMoment } from '../../types';
import { getGlucoseInsight, getFallbackMessage } from '../../lib/llm';

interface QuickAction {
  icon: IconName;
  label: string;
  route: string;
  color: string;
}

const ACTIONS: QuickAction[] = [
  { icon: 'glucose', label: 'Anotar glicemia', route: '/glicemia', color: colors.red },
  { icon: 'insulin', label: 'Anotar insulina', route: '/insulina', color: colors.text2 },
  { icon: 'meal', label: 'Registrar refeição', route: '/nutricao', color: colors.green },
  { icon: 'learn', label: 'Aprender', route: '/(tabs)/aprender', color: colors.yellow },
];

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const [child, setChild] = useState<Child | null>(null);
  const [glucose, setGlucose] = useState<GlucoseReading[]>([]);
  const [insulin, setInsulin] = useState<InsulinLog[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dashboardInsight, setDashboardInsight] = useState('');
  const [showAuthBanner, setShowAuthBanner] = useState(false);
  const [linked, setLinked] = useState<LinkedChild[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('responsavel');

  const load = useCallback(async () => {
    const [c, lk, act, at] = await Promise.all([
      getChild(),
      getLinkedChildren(),
      getActiveChildId(),
      getAccountType(),
    ]);
    if (at === 'medico') {
      router.replace('/(tabs)/pacientes');
      return;
    }
    setChild(c);
    setLinked(lk);
    setActiveChildId(act);
    setAccountType(at);

    const childId = c?.id ?? 'local';
    const [g, i, m] = await Promise.all([
      fetchGlucoseReadingsDB(childId),
      fetchInsulinLogsDB(childId),
      fetchMealsDB(childId),
    ]);
    setGlucose(g);
    setInsulin(i);
    setMeals(m);

    if (g.length > 0 && c) {
      const latest = g[0];
      const momentLabel = MOMENT_LABELS[latest.moment]?.label ?? latest.moment ?? '';
      getGlucoseInsight(
        latest.reading_value,
        c.name,
        c.glucose_target_min,
        c.glucose_target_max,
        momentLabel,
      ).then(setDashboardInsight);
    } else {
      setDashboardInsight('');
    }

    const prompt = await shouldPromptAuth();
    setShowAuthBanner(prompt);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const lastGlucose = glucose[0];
  const thermoValue = lastGlucose?.reading_value ?? 0;
  const thermoStatus = child
    ? getGlucoseStatus(thermoValue, child.glucose_target_min, child.glucose_target_max)
    : 'green';

  const insightText = dashboardInsight || getFallbackMessage();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.topbar}>
        {linked.length > 0 ? (
          <ChildSwitcher
            children={linked}
            activeChildId={activeChildId}
            accountType={accountType}
            onChange={load}
          />
        ) : (
          <Text style={styles.greeting}>Olá, família</Text>
        )}
      </View>

      {showAuthBanner && (
        <Card style={styles.authBanner}>
          <View style={styles.authBannerRow}>
            <Icon name='heart-active' size={18} color={colors.red} />
            <Text style={styles.authBannerText}>
              Confirme seu e-mail para não perder seu histórico
            </Text>
            <TouchableOpacity onPress={() => setShowAuthBanner(false)}>
              <Icon name='close' size={18} color={colors.text3} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.authBannerBtn}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.authBannerBtnText}>Criar conta grátis</Text>
          </TouchableOpacity>
        </Card>
      )}

      {lastGlucose ? (
        <Thermometer
          value={thermoValue}
          status={thermoStatus}
          time={formatTimeAgo(lastGlucose.reading_time)}
        />
      ) : (
        <View style={styles.emptyThermo}>
          <Icon name='glucose' size={48} color={colors.text3} />
          <Text style={styles.emptyText}>
            Nenhuma medição ainda.{'\n'}Que tal registrar a primeira?
          </Text>
        </View>
      )}

      <View style={styles.quickActions}>
        {ACTIONS.map(a => (
          <TouchableOpacity
            key={a.route}
            style={styles.quickBtn}
            onPress={() => router.push(a.route as any)}
            activeOpacity={0.85}
          >
            <Icon name={a.icon} size={28} color={a.color} />
            <Text style={styles.quickLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <IAInsight text={insightText} />

      {(glucose.length > 0 || insulin.length > 0 || meals.length > 0) && (
        <Card>
          <View style={styles.sectionRow}>
            <Icon name='clipboard' size={16} color={colors.text2} />
            <Text style={styles.sectionTitle}>Hoje</Text>
          </View>
          {glucose.slice(0, 3).map(g => (
            <TimelineItem
              key={g.id}
              dotColor={
                child
                  ? getGlucoseStatus(g.reading_value, child.glucose_target_min, child.glucose_target_max)
                  : 'green'
              }
              value={`${g.reading_value} mg/dL`}
              meta={`${formatTime(g.reading_time)} · ${MOMENT_LABELS[g.moment]?.label ?? g.moment ?? ''}`}
            />
          ))}
          {insulin.slice(0, 2).map(i => (
            <TimelineItem
              key={i.id}
              dotColor='green'
              value={`${i.dose_units}u insulina ${INSULIN_LABELS[i.insulin_type as InsulinType]?.label ?? i.insulin_type}`}
              meta={formatTime(i.applied_time)}
            />
          ))}
          {meals.slice(0, 1).map(m => (
            <TimelineItem
              key={m.id}
              dotColor='green'
              value={m.description}
              meta={`${formatTime(m.meal_time)}${m.carbs_grams ? ` · ~${m.carbs_grams}g carbo` : ''}`}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `medido há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `medido há ${hrs}h`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: radius.lg,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  greeting: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.peach,
    justifyContent: 'center', alignItems: 'center',
  },
  authBanner: {
    backgroundColor: colors.rose,
    marginBottom: 12,
    gap: 10,
  },
  authBannerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  authBannerText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  authBannerBtn: {
    backgroundColor: colors.red,
    borderRadius: radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  authBannerBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  emptyThermo: {
    alignItems: 'center', paddingVertical: 40,
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    marginBottom: 12,
    gap: 12,
  },
  emptyText: { fontSize: fontSize.sm, color: colors.text2, textAlign: 'center' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  quickBtn: {
    width: '48%', backgroundColor: colors.card,
    borderRadius: radius.lg, paddingVertical: 18, paddingHorizontal: 12,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  quickLabel: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
});
