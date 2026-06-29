import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../../constants/theme';
import { Card } from '../../components/Card';
import { IAInsight } from '../../components/IAInsight';
import { TimelineItem } from '../../components/TimelineItem';
import { Button } from '../../components/Button';
import ChildSwitcher from '../../components/ChildSwitcher';
import DonutProgress from '../../components/DonutProgress';
import Icon from '../../components/Icon';
import { getChild, getLinkedChildren, getActiveChildId, getAccountType, LinkedChild } from '../../lib/store';
import {
  fetchGlucoseReadingsDB,
  fetchInsulinLogsDB,
  fetchMealsDB,
} from '../../lib/supabase-db';
import { Child, GlucoseReading, InsulinLog, Meal, getGlucoseStatus, INSULIN_LABELS, MOMENT_LABELS, InsulinType, AccountType } from '../../types';
import { getPatternInsight } from '../../lib/llm';

const CHART_HEIGHT = 120;
const CHART_BAR_MAX_H = 100;

type Period = '7' | '14' | '30' | 'tudo';
type Filter = 'tudo' | 'glicemia' | 'insulina' | 'refeicao';

const PERIOD_DAYS: Record<Period, number | null> = { '7': 7, '14': 14, '30': 30, tudo: null };

function withinPeriod(iso: string, period: Period): boolean {
  const days = PERIOD_DAYS[period];
  if (days == null) return true;
  return Date.now() - new Date(iso).getTime() <= days * 86400000;
}

function GlucoseBarChart({ readings, targetMin, targetMax }: { readings: GlucoseReading[]; targetMin: number; targetMax: number }) {
  const last = readings.slice(0, 14).reverse();
  if (last.length === 0) return null;
  const maxVal = Math.max(...last.map(r => r.reading_value), targetMax + 20);
  const minVal = Math.min(...last.map(r => r.reading_value), targetMin - 20, 40);
  const range = maxVal - minVal || 1;
  const barH = (v: number) => Math.max(4, Math.round(((v - minVal) / range) * CHART_BAR_MAX_H));
  const barColor = (v: number) => {
    const s = getGlucoseStatus(v, targetMin, targetMax);
    return s === 'green' ? colors.green : s === 'yellow' ? colors.yellow : colors.red;
  };
  const targetMinY = Math.round(((targetMin - minVal) / range) * CHART_BAR_MAX_H);
  const targetMaxY = Math.round(((targetMax - minVal) / range) * CHART_BAR_MAX_H);
  const zoneH = targetMaxY - targetMinY;

  return (
    <View style={chartStyles.wrap}>
      <Text style={chartStyles.title}>Glicemias recentes (mg/dL)</Text>
      <View style={[chartStyles.chartArea, { height: CHART_HEIGHT }]}>
        <View style={[chartStyles.targetZone, { bottom: targetMinY, height: Math.max(zoneH, 0) }]} />
        <View style={chartStyles.barsRow}>
          {last.map((r, i) => (
            <View key={r.id ?? i} style={chartStyles.barWrap}>
              <View style={[chartStyles.bar, { height: barH(r.reading_value), backgroundColor: barColor(r.reading_value) }]} />
              <Text style={chartStyles.barVal}>{r.reading_value}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={chartStyles.legend}>
        <View style={[chartStyles.legendDot, { backgroundColor: colors.green }]} />
        <Text style={chartStyles.legendText}>Na meta</Text>
        <View style={[chartStyles.legendDot, { backgroundColor: colors.yellow }]} />
        <Text style={chartStyles.legendText}>Alerta</Text>
        <View style={[chartStyles.legendDot, { backgroundColor: colors.red }]} />
        <Text style={chartStyles.legendText}>Fora</Text>
      </View>
    </View>
  );
}

function MomentBarChart({ readings, targetMin, targetMax }: { readings: GlucoseReading[]; targetMin: number; targetMax: number }) {
  const moments = ['jejum', 'antes_comer', 'depois_comer', 'antes_dormir'] as const;
  const avgs = moments.map(m => {
    const filtered = readings.filter(r => r.moment === m);
    if (filtered.length === 0) return null;
    return { moment: m, avg: Math.round(filtered.reduce((s, r) => s + r.reading_value, 0) / filtered.length), count: filtered.length };
  }).filter(Boolean) as { moment: string; avg: number; count: number }[];
  if (avgs.length === 0) return null;
  const maxVal = Math.max(...avgs.map(a => a.avg), targetMax);
  const barH = (v: number) => Math.max(4, Math.round((v / maxVal) * CHART_BAR_MAX_H));
  const barColor = (v: number) => getGlucoseStatus(v, targetMin, targetMax) === 'green' ? colors.green : getGlucoseStatus(v, targetMin, targetMax) === 'yellow' ? colors.yellow : colors.red;

  return (
    <View style={chartStyles.wrap}>
      <Text style={chartStyles.title}>Média por momento</Text>
      <View style={[chartStyles.chartArea, { height: CHART_HEIGHT }]}>
        <View style={chartStyles.barsRow}>
          {avgs.map(a => (
            <View key={a.moment} style={chartStyles.barWrap}>
              <View style={[chartStyles.bar, { height: barH(a.avg), backgroundColor: barColor(a.avg) }]} />
              <Text style={chartStyles.barVal}>{a.avg}</Text>
              <Text style={chartStyles.barMoment} numberOfLines={2}>
                {MOMENT_LABELS[a.moment as keyof typeof MOMENT_LABELS]?.label?.split(' ')[0] ?? a.moment}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function Diario() {
  const insets = useSafeAreaInsets();
  const [child, setChild] = useState<Child | null>(null);
  const [glucoseAll, setGlucoseAll] = useState<GlucoseReading[]>([]);
  const [insulinAll, setInsulinAll] = useState<InsulinLog[]>([]);
  const [mealsAll, setMealsAll] = useState<Meal[]>([]);
  const [patternText, setPatternText] = useState('');
  const [linked, setLinked] = useState<LinkedChild[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('responsavel');
  const [period, setPeriod] = useState<Period>('14');
  const [filter, setFilter] = useState<Filter>('tudo');

  const load = useCallback(async () => {
    const [c, lk, act, at] = await Promise.all([
      getChild(), getLinkedChildren(), getActiveChildId(), getAccountType(),
    ]);
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
    setGlucoseAll(g);
    setInsulinAll(i);
    setMealsAll(m);

    if (g.length >= 3 && c) {
      const readings = g.map(r => ({
        value: r.reading_value,
        moment: MOMENT_LABELS[r.moment]?.label ?? r.moment ?? '',
        time: formatTime(r.reading_time),
      }));
      getPatternInsight(readings, c.name, c.glucose_target_min, c.glucose_target_max).then(setPatternText);
    } else {
      setPatternText('');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const glucose = glucoseAll.filter(r => withinPeriod(r.created_at, period));
  const insulin = insulinAll.filter(r => withinPeriod(r.created_at, period));
  const meals = mealsAll.filter(r => withinPeriod(r.created_at, period));

  const min = child?.glucose_target_min ?? 70;
  const max = child?.glucose_target_max ?? 180;
  const avg = glucose.length > 0 ? Math.round(glucose.reduce((s, g) => s + g.reading_value, 0) / glucose.length) : 0;
  const peak = glucose.length > 0 ? Math.max(...glucose.map(g => g.reading_value)) : 0;
  const low = glucose.length > 0 ? Math.min(...glucose.map(g => g.reading_value)) : 0;
  const inTarget = glucose.filter(g => g.reading_value >= min && g.reading_value <= max).length;
  const pct = glucose.length > 0 ? Math.round((inTarget / glucose.length) * 100) : 0;

  const totalCarbs = meals.reduce((s, m) => s + (m.carbs_grams ?? 0), 0);
  const carbMeals = meals.filter(m => m.carbs_grams != null);
  const avgCarbs = carbMeals.length > 0 ? Math.round(totalCarbs / carbMeals.length) : 0;

  const hasData = glucose.length > 0 || insulin.length > 0 || meals.length > 0;
  const showGlucose = filter === 'tudo' || filter === 'glicemia';
  const showInsulin = filter === 'tudo' || filter === 'insulina';
  const showMeals = filter === 'tudo' || filter === 'refeicao';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.topbar}>
        {linked.length > 0 ? (
          <ChildSwitcher children={linked} activeChildId={activeChildId} accountType={accountType} onChange={load} />
        ) : (
          <View style={styles.titleRow}>
            <Icon name="chart" size={20} color={colors.text2} />
            <Text style={styles.title}>Meu Diário</Text>
          </View>
        )}
        <TouchableOpacity style={styles.reportBtn} onPress={() => router.push('/relatorio')}>
          <Icon name="document" size={14} color={colors.red} />
          <Text style={styles.reportBtnText}>Histórico</Text>
        </TouchableOpacity>
      </View>

      {/* Period selector */}
      <View style={styles.segmented}>
        {(['7', '14', '30', 'tudo'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.segBtn, period === p && styles.segBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.segText, period === p && styles.segTextActive]}>
              {p === 'tudo' ? 'Tudo' : `${p}d`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type filter */}
      <View style={styles.filterRow}>
        {([['tudo', 'Tudo', 'list'], ['glicemia', 'Glicemia', 'glucose'], ['insulina', 'Insulina', 'insulin'], ['refeicao', 'Refeições', 'meal']] as [Filter, string, 'list' | 'glucose' | 'insulin' | 'meal'][]).map(([key, label, icon]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
            onPress={() => setFilter(key)}
          >
            <Icon name={icon} size={13} color={filter === key ? '#fff' : colors.text2} />
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!hasData ? (
        <View style={styles.empty}>
          <Icon name="chart" size={48} color={colors.text3} />
          <Text style={styles.emptyTitle}>Nenhum registro no período</Text>
          <Text style={styles.emptyText}>Tente um período maior ou registre na aba Início.</Text>
        </View>
      ) : (
        <>
          {showGlucose && glucose.length > 0 && (
            <>
              <Card>
                <View style={styles.sectionRow}>
                  <Icon name="trending" size={16} color={colors.text2} />
                  <Text style={styles.sectionTitle}>Resumo de glicemia</Text>
                </View>
                <View style={styles.statsRow}>
                  <StatBox label="Média" value={`${avg}`} color={getGlucoseStatus(avg, min, max) === 'green' ? colors.green : colors.yellow} />
                  <StatBox label="Pico" value={`${peak}`} color={peak > max ? colors.red : colors.yellow} />
                  <StatBox label="Mínima" value={`${low}`} color={low < min ? colors.red : colors.green} />
                  <StatBox label="Registros" value={`${glucose.length}`} color={colors.text2} />
                </View>
              </Card>

              <Card style={{ paddingHorizontal: 8 }}>
                <GlucoseBarChart readings={glucose} targetMin={min} targetMax={max} />
              </Card>

              <View style={styles.twoCol}>
                <Card style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.donutTitle}>Tempo na meta</Text>
                  <DonutProgress pct={pct} size={108} color={pct >= 70 ? colors.green : colors.yellow} label={`${pct}%`} sub="na meta" />
                  <Text style={styles.donutRange}>{min}–{max} mg/dL</Text>
                </Card>
                <Card style={{ flex: 1.6, paddingHorizontal: 8 }}>
                  <MomentBarChart readings={glucose} targetMin={min} targetMax={max} />
                </Card>
              </View>

              {patternText ? <IAInsight label="Padrões identificados" text={patternText} /> : null}
            </>
          )}

          {/* Nutrition section */}
          {showMeals && meals.length > 0 && (
            <Card>
              <View style={styles.sectionRow}>
                <Icon name="nutrition" size={16} color={colors.green} />
                <Text style={styles.sectionTitle}>Nutrição</Text>
              </View>
              <View style={styles.statsRow}>
                <StatBox label="Refeições" value={`${meals.length}`} color={colors.text2} />
                <StatBox label="Carbos totais" value={`${totalCarbs}g`} color={colors.green} />
                <StatBox label="Média/refeição" value={`${avgCarbs}g`} color={colors.green} />
              </View>
            </Card>
          )}

          <Button title="Gerar relatório em PDF" onPress={() => router.push('/relatorio')} />

          {/* Filtered timeline */}
          <Card>
            <View style={styles.sectionRow}>
              <Icon name="calendar" size={16} color={colors.text2} />
              <Text style={styles.sectionTitle}>Registros</Text>
            </View>
            {showGlucose && glucose.map(g => (
              <TimelineItem
                key={g.id}
                dotColor={getGlucoseStatus(g.reading_value, min, max)}
                value={`${g.reading_value} mg/dL`}
                meta={`${formatDateTime(g.reading_time)} · ${MOMENT_LABELS[g.moment]?.label ?? g.moment ?? ''}${authorSuffix(g.recorded_by)}`}
              />
            ))}
            {showInsulin && insulin.map(i => (
              <TimelineItem
                key={i.id}
                dotColor="green"
                value={`${i.dose_units}u ${INSULIN_LABELS[i.insulin_type as InsulinType]?.label ?? i.insulin_type}`}
                meta={`${formatDateTime(i.applied_time)}${authorSuffix(i.recorded_by)}`}
              />
            ))}
            {showMeals && meals.map(m => (
              <TimelineItem
                key={m.id}
                dotColor="green"
                value={m.description}
                meta={`${formatDateTime(m.meal_time)}${m.carbs_grams ? ` · ~${m.carbs_grams}g carbo` : ''}${authorSuffix(m.recorded_by)}`}
              />
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function authorSuffix(recordedBy?: string): string {
  if (!recordedBy || recordedBy === 'user') return '';
  return ` · por ${recordedBy}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const t = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  if (sameDay) return `Hoje ${t}`;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${t}`;
}

const chartStyles = StyleSheet.create({
  wrap: { paddingVertical: 4 },
  title: { fontSize: 12, fontWeight: '700', color: colors.text2, marginBottom: 10, textAlign: 'center' },
  chartArea: { position: 'relative', justifyContent: 'flex-end' },
  targetZone: {
    position: 'absolute', left: 0, right: 0,
    backgroundColor: 'rgba(39,174,96,0.08)',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(39,174,96,0.3)',
  },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', flex: 1, gap: 3, paddingBottom: 20 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', borderRadius: 3, minHeight: 4 },
  barVal: { fontSize: 9, color: colors.text3, marginTop: 2, textAlign: 'center' },
  barMoment: { fontSize: 8, color: colors.text3, textAlign: 'center', marginTop: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.text3 },
});

const statStyles = StyleSheet.create({
  box: { alignItems: 'center', flex: 1 },
  value: { fontSize: fontSize.xl, fontWeight: '700' },
  label: { fontSize: 11, color: colors.text3, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 12, borderRadius: radius.lg,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.red,
  },
  reportBtnText: { fontSize: 12, fontWeight: '700', color: colors.red },
  segmented: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md,
    padding: 4, gap: 4, marginBottom: 10,
  },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  segBtnActive: { backgroundColor: colors.red },
  segText: { fontSize: 13, fontWeight: '600', color: colors.text2 },
  segTextActive: { color: '#fff' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
  },
  filterChipActive: { backgroundColor: colors.text2, borderColor: colors.text2 },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.text2 },
  filterTextActive: { color: '#fff' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  statsRow: { flexDirection: 'row', gap: 8 },
  twoCol: { flexDirection: 'row', gap: 12 },
  donutTitle: { fontSize: 12, fontWeight: '700', color: colors.text2, marginBottom: 8 },
  donutRange: { fontSize: 10, color: colors.text3, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: fontSize.sm, color: colors.text2, textAlign: 'center' },
});
