import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../../constants/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import ChildSwitcher from '../../components/ChildSwitcher';
import DonutProgress from '../../components/DonutProgress';
import Icon from '../../components/Icon';
import { getChild, getLinkedChildren, getActiveChildId, getAccountType, LinkedChild } from '../../lib/store';
import { fetchGlucoseReadingsDB, fetchInsulinLogsDB, fetchMealsDB } from '../../lib/supabase-db';
import { Child, GlucoseReading, InsulinLog, Meal, getGlucoseStatus, MOMENT_LABELS, INSULIN_LABELS, InsulinType, AccountType } from '../../types';

type Period = '7' | '14' | '30' | 'tudo';
const PERIOD_DAYS: Record<Period, number | null> = { '7': 7, '14': 14, '30': 30, tudo: null };
const within = (iso: string, p: Period) => { const d = PERIOD_DAYS[p]; return d == null || Date.now() - new Date(iso).getTime() <= d * 86400000; };

export default function Dados() {
  const insets = useSafeAreaInsets();
  const [child, setChild] = useState<Child | null>(null);
  const [glucoseAll, setGlucoseAll] = useState<GlucoseReading[]>([]);
  const [insulinAll, setInsulinAll] = useState<InsulinLog[]>([]);
  const [mealsAll, setMealsAll] = useState<Meal[]>([]);
  const [linked, setLinked] = useState<LinkedChild[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('medico');
  const [period, setPeriod] = useState<Period>('30');

  const load = useCallback(async () => {
    const [c, lk, act, at] = await Promise.all([getChild(), getLinkedChildren(), getActiveChildId(), getAccountType()]);
    setChild(c); setLinked(lk); setActiveChildId(act); setAccountType(at);
    const id = c?.id ?? 'local';
    const [g, i, m] = await Promise.all([fetchGlucoseReadingsDB(id), fetchInsulinLogsDB(id), fetchMealsDB(id)]);
    setGlucoseAll(g); setInsulinAll(i); setMealsAll(m);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const glucose = glucoseAll.filter(r => within(r.created_at, period));
  const insulin = insulinAll.filter(r => within(r.created_at, period));
  const meals = mealsAll.filter(r => within(r.created_at, period));

  const min = child?.glucose_target_min ?? 70;
  const max = child?.glucose_target_max ?? 180;
  const avg = glucose.length ? Math.round(glucose.reduce((s, g) => s + g.reading_value, 0) / glucose.length) : 0;
  const peak = glucose.length ? Math.max(...glucose.map(g => g.reading_value)) : 0;
  const low = glucose.length ? Math.min(...glucose.map(g => g.reading_value)) : 0;
  const hiCount = glucose.filter(g => g.reading_value > max).length;
  const loCount = glucose.filter(g => g.reading_value < min).length;
  const inTarget = glucose.length - hiCount - loCount;
  const pct = glucose.length ? Math.round((inTarget / glucose.length) * 100) : 0;
  const hiPct = glucose.length ? Math.round((hiCount / glucose.length) * 100) : 0;
  const loPct = glucose.length ? Math.round((loCount / glucose.length) * 100) : 0;
  // Estimated A1c (ADAG): A1c = (avg + 46.7) / 28.7
  const eA1c = glucose.length ? ((avg + 46.7) / 28.7).toFixed(1) : '—';
  const totalDose = insulin.reduce((s, i) => s + i.dose_units, 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs_grams ?? 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.topbar}>
        {linked.length > 0 ? (
          <ChildSwitcher children={linked} activeChildId={activeChildId} accountType={accountType} onChange={load} />
        ) : (
          <Text style={styles.title}>Dados clínicos</Text>
        )}
        <TouchableOpacity style={styles.reportBtn} onPress={() => router.push('/relatorio')}>
          <Icon name="document" size={14} color={colors.red} />
          <Text style={styles.reportBtnText}>Relatório</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segmented}>
        {(['7', '14', '30', 'tudo'] as Period[]).map(p => (
          <TouchableOpacity key={p} style={[styles.segBtn, period === p && styles.segBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.segText, period === p && styles.segTextActive]}>{p === 'tudo' ? 'Tudo' : `${p}d`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {glucose.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="analytics" size={48} color={colors.text3} />
          <Text style={styles.emptyTitle}>Sem dados no período</Text>
          <Text style={styles.emptyText}>Selecione um período maior para visualizar.</Text>
        </View>
      ) : (
        <>
          {/* Key clinical metrics */}
          <Card>
            <View style={styles.sectionRow}>
              <Icon name="pulse" size={16} color={colors.text2} />
              <Text style={styles.sectionTitle}>Métricas glicêmicas</Text>
            </View>
            <View style={styles.metricsGrid}>
              <Metric label="Média" value={`${avg}`} unit="mg/dL" color={getGlucoseStatus(avg, min, max) === 'green' ? colors.green : colors.yellow} />
              <Metric label="HbA1c est." value={`${eA1c}`} unit="%" color={colors.text} />
              <Metric label="Desvio (pico)" value={`${peak}`} unit="mg/dL" color={peak > max ? colors.red : colors.yellow} />
              <Metric label="Mínima" value={`${low}`} unit="mg/dL" color={low < min ? colors.red : colors.green} />
            </View>
          </Card>

          {/* Time in range — clinical breakdown */}
          <Card style={{ alignItems: 'center' }}>
            <Text style={styles.tirTitle}>Tempo no alvo (TIR)</Text>
            <DonutProgress pct={pct} size={130} color={pct >= 70 ? colors.green : colors.yellow} label={`${pct}%`} sub="no alvo" />
            <Text style={styles.tirRange}>Alvo: {min}–{max} mg/dL</Text>
            <View style={styles.tirBreak}>
              <View style={styles.tirItem}><View style={[styles.tirDot, { backgroundColor: colors.red }]} /><Text style={styles.tirLabel}>Hipo {loPct}%</Text></View>
              <View style={styles.tirItem}><View style={[styles.tirDot, { backgroundColor: colors.green }]} /><Text style={styles.tirLabel}>Alvo {pct}%</Text></View>
              <View style={styles.tirItem}><View style={[styles.tirDot, { backgroundColor: colors.yellow }]} /><Text style={styles.tirLabel}>Hiper {hiPct}%</Text></View>
            </View>
          </Card>

          {/* Treatment summary */}
          <Card>
            <View style={styles.sectionRow}>
              <Icon name="insulin" size={16} color={colors.text2} />
              <Text style={styles.sectionTitle}>Tratamento no período</Text>
            </View>
            <View style={styles.metricsGrid}>
              <Metric label="Aplicações" value={`${insulin.length}`} unit="" color={colors.text2} />
              <Metric label="Dose total" value={`${totalDose}`} unit="U" color={colors.text2} />
              <Metric label="Refeições" value={`${meals.length}`} unit="" color={colors.green} />
              <Metric label="Carbos" value={`${totalCarbs}`} unit="g" color={colors.green} />
            </View>
          </Card>

          {/* Recent readings table */}
          <Card>
            <View style={styles.sectionRow}>
              <Icon name="list" size={16} color={colors.text2} />
              <Text style={styles.sectionTitle}>Últimas medições</Text>
            </View>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 1.4 }]}>Quando</Text>
              <Text style={[styles.th, { flex: 1 }]}>Valor</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>Momento</Text>
            </View>
            {glucose.slice(0, 12).map(g => {
              const st = getGlucoseStatus(g.reading_value, min, max);
              const c = st === 'green' ? colors.green : st === 'yellow' ? colors.yellow : colors.red;
              const d = new Date(g.reading_time);
              return (
                <View key={g.id} style={styles.tableRow}>
                  <Text style={[styles.td, { flex: 1.4 }]}>
                    {d.getDate().toString().padStart(2, '0')}/{(d.getMonth() + 1).toString().padStart(2, '0')} {d.getHours().toString().padStart(2, '0')}:{d.getMinutes().toString().padStart(2, '0')}
                  </Text>
                  <Text style={[styles.td, { flex: 1, color: c, fontWeight: '800' }]}>{g.reading_value}</Text>
                  <Text style={[styles.td, { flex: 1.4 }]} numberOfLines={1}>{MOMENT_LABELS[g.moment]?.label ?? g.moment}</Text>
                </View>
              );
            })}
          </Card>

          <Button title="Gerar relatório clínico (PDF)" onPress={() => router.push('/relatorio')} />
        </>
      )}
    </ScrollView>
  );
}

function Metric({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}<Text style={styles.metricUnit}> {unit}</Text></Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 12, borderRadius: radius.lg,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: colors.red,
  },
  reportBtnText: { fontSize: 12, fontWeight: '700', color: colors.red },
  segmented: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4, gap: 4, marginBottom: 12 },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  segBtnActive: { backgroundColor: colors.red },
  segText: { fontSize: 13, fontWeight: '600', color: colors.text2 },
  segTextActive: { color: '#fff' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metric: { width: '50%', paddingVertical: 8 },
  metricValue: { fontSize: 22, fontWeight: '900' },
  metricUnit: { fontSize: 11, fontWeight: '600', color: colors.text3 },
  metricLabel: { fontSize: 12, color: colors.text3, marginTop: 2 },
  tirTitle: { fontSize: 13, fontWeight: '700', color: colors.text2, marginBottom: 10 },
  tirRange: { fontSize: 12, color: colors.text3, marginTop: 8 },
  tirBreak: { flexDirection: 'row', gap: 16, marginTop: 12 },
  tirItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tirDot: { width: 9, height: 9, borderRadius: 5 },
  tirLabel: { fontSize: 12, color: colors.text2, fontWeight: '600' },
  tableHead: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  th: { fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F4F4F4' },
  td: { fontSize: 13, color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: fontSize.sm, color: colors.text2, textAlign: 'center' },
});
