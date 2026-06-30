import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, radius, fontSize, spacing } from '../constants/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import Icon from '../components/Icon';
import { getChild } from '../lib/store';
import { genId } from '../lib/id';
import {
  fetchGlucoseReadingsDB,
  fetchInsulinLogsDB,
  fetchMealsDB,
} from '../lib/supabase-db';
import { getReportHistory, saveReportRecord, ReportRecord } from '../lib/store';
import { generateDoctorReport } from '../lib/llm';
import { GlucoseReading, InsulinLog, Meal, getGlucoseStatus, INSULIN_LABELS, MOMENT_LABELS, InsulinType } from '../types';

type Period = 'semana' | 'mes' | 'tudo';

const PERIOD_LABELS: Record<Period, string> = {
  semana: 'Última semana',
  mes: 'Último mês',
  tudo: 'Todo o período',
};

function filterByPeriod<T extends { created_at: string }>(items: T[], period: Period): T[] {
  if (period === 'tudo') return items;
  const now = Date.now();
  const cutoff = period === 'semana' ? 7 * 86400000 : 30 * 86400000;
  return items.filter(item => now - new Date(item.created_at).getTime() <= cutoff);
}

function buildReportHTML(
  childName: string,
  period: Period,
  glucose: GlucoseReading[],
  insulin: InsulinLog[],
  meals: Meal[],
  aiText: string,
  stats: { avg: number; peak: number; low: number; inTargetPct: number; targetMin: number; targetMax: number },
): string {
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const statusColor = (v: number) => v < stats.targetMin ? '#E74C3C' : v > stats.targetMax ? '#F39C12' : '#27AE60';

  const glucoseRows = glucose.slice(0, 30).map(r => {
    const color = statusColor(r.reading_value);
    return `<tr>
      <td>${new Date(r.reading_time).toLocaleDateString('pt-BR')}</td>
      <td>${new Date(r.reading_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
      <td style="color:${color};font-weight:700">${r.reading_value} mg/dL</td>
      <td>${MOMENT_LABELS[r.moment]?.label ?? r.moment}</td>
    </tr>`;
  }).join('');

  const insulinRows = insulin.slice(0, 20).map(l => `<tr>
    <td>${new Date(l.applied_time).toLocaleDateString('pt-BR')}</td>
    <td>${new Date(l.applied_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
    <td>${l.dose_units}u</td>
    <td>${INSULIN_LABELS[l.insulin_type as InsulinType]?.label ?? l.insulin_type}</td>
  </tr>`).join('');

  const pctBarWidth = Math.round(stats.inTargetPct);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório Doce Cuidado — ${childName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #2C3E50; background: #fff; padding: 40px; font-size: 14px; }
    .header { background: linear-gradient(135deg, #E74C3C, #C0392B); color: white; padding: 24px 32px; border-radius: 12px; margin-bottom: 28px; }
    .header h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
    .header p { opacity: 0.85; margin-top: 6px; font-size: 15px; }
    .header .badge { display: inline-block; background: rgba(255,255,255,0.25); padding: 4px 12px; border-radius: 20px; font-size: 13px; margin-top: 10px; }
    .stats-row { display: flex; gap: 12px; margin-bottom: 24px; }
    .stat-box { flex: 1; background: #FFF5EE; border-radius: 12px; padding: 16px; text-align: center; border: 2px solid #FDE8D0; }
    .stat-box .val { font-size: 28px; font-weight: 900; line-height: 1; }
    .stat-box .lbl { font-size: 11px; color: #7F8C8D; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 16px; font-weight: 700; color: #E74C3C; border-bottom: 2px solid #FDE8D0; padding-bottom: 6px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #FDE8D0; padding: 8px 10px; text-align: left; font-size: 12px; font-weight: 700; color: #7F8C8D; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 8px 10px; border-bottom: 1px solid #F0F0F0; font-size: 13px; }
    tr:last-child td { border-bottom: none; }
    .progress-bar-bg { background: #F0F0F0; border-radius: 6px; height: 14px; margin-top: 8px; overflow: hidden; }
    .progress-bar-fill { height: 100%; background: #27AE60; border-radius: 6px; width: ${pctBarWidth}%; }
    .ai-box { background: #F3E5F5; border-left: 4px solid #9B59B6; border-radius: 8px; padding: 14px 16px; }
    .ai-box .ai-label { font-size: 11px; font-weight: 700; color: #9B59B6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .ai-box p { font-size: 13px; line-height: 1.7; color: #2C3E50; }
    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #BDC3C7; border-top: 1px solid #F0F0F0; padding-top: 16px; }
    .target-range { display: inline-block; background: #D4EDDA; color: #1E8449; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Doce Cuidado</h1>
    <p>Relatório de <strong>${childName}</strong> &mdash; ${PERIOD_LABELS[period]}</p>
    <span class="badge">Gerado em ${now}</span>
  </div>

  <div class="stats-row">
    <div class="stat-box">
      <div class="val" style="color:#27AE60">${stats.avg}</div>
      <div class="lbl">Média (mg/dL)</div>
    </div>
    <div class="stat-box">
      <div class="val" style="color:#E74C3C">${stats.peak}</div>
      <div class="lbl">Pico (mg/dL)</div>
    </div>
    <div class="stat-box">
      <div class="val" style="color:#F39C12">${stats.low}</div>
      <div class="lbl">Mínima (mg/dL)</div>
    </div>
    <div class="stat-box">
      <div class="val" style="color:${stats.inTargetPct >= 70 ? '#27AE60' : '#E74C3C'}">${stats.inTargetPct}%</div>
      <div class="lbl">Na meta</div>
    </div>
  </div>

  <div class="section">
    <h2>Tempo na meta <span class="target-range">${stats.targetMin}–${stats.targetMax} mg/dL</span></h2>
    <div class="progress-bar-bg"><div class="progress-bar-fill"></div></div>
    <p style="font-size:12px;color:#7F8C8D;margin-top:6px">${stats.inTargetPct}% das medições na faixa alvo (${glucose.length} medições no período)</p>
  </div>

  ${aiText ? `<div class="section">
    <h2>Análise da IA</h2>
    <div class="ai-box">
      <div class="ai-label">Gotinha — Assistente</div>
      <p>${aiText}</p>
    </div>
  </div>` : ''}

  <div class="section">
    <h2>Registros de Glicemia (${glucose.length})</h2>
    ${glucose.length > 0 ? `<table>
      <thead><tr><th>Data</th><th>Hora</th><th>Valor</th><th>Momento</th></tr></thead>
      <tbody>${glucoseRows}</tbody>
    </table>` : '<p style="color:#95A5A6">Nenhum registro no período.</p>'}
  </div>

  <div class="section">
    <h2>Aplicações de Insulina (${insulin.length})</h2>
    ${insulin.length > 0 ? `<table>
      <thead><tr><th>Data</th><th>Hora</th><th>Dose</th><th>Tipo</th></tr></thead>
      <tbody>${insulinRows}</tbody>
    </table>` : '<p style="color:#95A5A6">Nenhum registro no período.</p>'}
  </div>

  <div class="section">
    <h2>Refeições registradas (${meals.length})</h2>
    ${meals.length > 0 ? `<table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Carbos</th></tr></thead>
      <tbody>
        ${meals.slice(0, 15).map(m => `<tr>
          <td>${new Date(m.meal_time).toLocaleDateString('pt-BR')}</td>
          <td>${m.description}</td>
          <td>${m.carbs_grams ? `${m.carbs_grams}g` : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#95A5A6">Nenhum registro no período.</p>'}
  </div>

  <div class="footer">
    Doce Cuidado &mdash; Relatório gerado automaticamente. Não substitui avaliação médica.<br>
    Meta de glicemia: ${stats.targetMin}–${stats.targetMax} mg/dL
  </div>
</body>
</html>`;
}

export default function Relatorio() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('semana');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [allGlucose, setAllGlucose] = useState<GlucoseReading[]>([]);
  const [allInsulin, setAllInsulin] = useState<InsulinLog[]>([]);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [childName, setChildName] = useState('');
  const [targetMin, setTargetMin] = useState(70);
  const [targetMax, setTargetMax] = useState(180);

  useEffect(() => {
    (async () => {
      const [child, h] = await Promise.all([getChild(), getReportHistory()]);
      setChildName(child?.name ?? 'Criança');
      setTargetMin(child?.glucose_target_min ?? 70);
      setTargetMax(child?.glucose_target_max ?? 180);
      setHistory(h);

      if (child?.id) {
        const [g, i, m] = await Promise.all([
          fetchGlucoseReadingsDB(child.id),
          fetchInsulinLogsDB(child.id),
          fetchMealsDB(child.id),
        ]);
        setAllGlucose(g);
        setAllInsulin(i);
        setAllMeals(m);
      }
    })();
  }, []);

  const glucose = filterByPeriod(allGlucose, period);
  const insulin = filterByPeriod(allInsulin, period);
  const meals = filterByPeriod(allMeals, period);

  const avg = glucose.length > 0 ? Math.round(glucose.reduce((s, g) => s + g.reading_value, 0) / glucose.length) : 0;
  const peak = glucose.length > 0 ? Math.max(...glucose.map(g => g.reading_value)) : 0;
  const low = glucose.length > 0 ? Math.min(...glucose.map(g => g.reading_value)) : 0;
  const inTarget = glucose.filter(g => g.reading_value >= targetMin && g.reading_value <= targetMax).length;
  const inTargetPct = glucose.length > 0 ? Math.round((inTarget / glucose.length) * 100) : 0;

  const buildAndShare = async (per: Period, g: GlucoseReading[], i: InsulinLog[], m: Meal[], s: { avg: number; peak: number; low: number; inTargetPct: number; targetMin: number; targetMax: number }) => {
    const glucoseData = g.slice(0, 20).map(r => ({
      value: r.reading_value,
      moment: MOMENT_LABELS[r.moment]?.label ?? r.moment ?? '',
      time: new Date(r.reading_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }));
    const insulinData = i.slice(0, 20).map(l => ({
      type: INSULIN_LABELS[l.insulin_type as InsulinType]?.label ?? l.insulin_type,
      dose: l.dose_units,
      time: new Date(l.applied_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }));
    const mealData = m.slice(0, 10).map(mm => ({
      description: mm.description,
      carbs: mm.carbs_grams ?? 0,
      time: new Date(mm.meal_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }));
    const aiText = await generateDoctorReport(childName, per === 'semana' ? 'week' : per === 'mes' ? 'month' : 'all', glucoseData, insulinData, mealData, s);
    const html = buildReportHTML(childName, per, g, i, m, aiText, s);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Relatório Doce Cuidado — ${childName}`,
      UTI: 'com.adobe.pdf',
    });
  };

  const reopenRecord = async (record: ReportRecord) => {
    setGenerating(true);
    try {
      const g = filterByPeriod(allGlucose, record.period);
      const i = filterByPeriod(allInsulin, record.period);
      const m = filterByPeriod(allMeals, record.period);
      const inT = g.filter(x => x.reading_value >= targetMin && x.reading_value <= targetMax).length;
      const stats = {
        avg: g.length ? Math.round(g.reduce((s, x) => s + x.reading_value, 0) / g.length) : 0,
        peak: g.length ? Math.max(...g.map(x => x.reading_value)) : 0,
        low: g.length ? Math.min(...g.map(x => x.reading_value)) : 0,
        inTargetPct: g.length ? Math.round((inT / g.length) * 100) : 0,
        targetMin, targetMax,
      };
      await buildAndShare(record.period, g, i, m, stats);
    } catch (e: unknown) {
      Alert.alert('Erro', `Não foi possível abrir o PDF. ${e instanceof Error ? e.message : ''}`);
    }
    setGenerating(false);
  };

  const handleGenerate = async () => {
    if (glucose.length === 0) {
      Alert.alert('Sem dados', 'Não há registros de glicemia no período selecionado.');
      return;
    }
    setGenerating(true);
    try {
      const stats = { avg, peak, low, inTargetPct, targetMin, targetMax };

      const glucoseData = glucose.slice(0, 20).map(r => ({
        value: r.reading_value,
        moment: MOMENT_LABELS[r.moment]?.label ?? r.moment ?? '',
        time: new Date(r.reading_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }));
      const insulinData = insulin.slice(0, 20).map(l => ({
        type: INSULIN_LABELS[l.insulin_type as InsulinType]?.label ?? l.insulin_type,
        dose: l.dose_units,
        time: new Date(l.applied_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }));
      const mealData = meals.slice(0, 10).map(m => ({
        description: m.description,
        carbs: m.carbs_grams ?? 0,
        time: new Date(m.meal_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }));

      const aiText = await generateDoctorReport(childName, period === 'semana' ? 'week' : period === 'mes' ? 'month' : 'all', glucoseData, insulinData, mealData, stats);
      const html = buildReportHTML(childName, period, glucose, insulin, meals, aiText, stats);

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const record: ReportRecord = {
        id: genId(),
        generated_at: new Date().toISOString(),
        period,
        child_name: childName,
        readings_count: glucose.length,
        avg,
        peak,
        low,
        in_target_pct: inTargetPct,
        target_min: targetMin,
        target_max: targetMax,
      };
      await saveReportRecord(record);
      setHistory(prev => [record, ...prev]);

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Relatório Doce Cuidado — ${childName}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e: unknown) {
      Alert.alert('Erro', `Não foi possível gerar o PDF. ${e instanceof Error ? e.message : ''}`);
    }
    setGenerating(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="back" size={22} color={colors.text2} />
        </TouchableOpacity>
        <Text style={styles.title}>Relatório PDF</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Preview dos stats */}
      <Card>
        <View style={styles.sectionRow}>
          <Icon name="trending" size={16} color={colors.text2} />
          <Text style={styles.sectionTitle}>Pré-visualização</Text>
        </View>
        <View style={styles.statsRow}>
          <StatBox label="Média" value={`${avg}`} unit="mg/dL" color={colors.green} />
          <StatBox label="Pico" value={`${peak}`} unit="mg/dL" color={peak > targetMax ? colors.red : colors.yellow} />
          <StatBox label="Na meta" value={`${inTargetPct}%`} unit="" color={inTargetPct >= 70 ? colors.green : colors.red} />
          <StatBox label="Registros" value={`${glucose.length}`} unit="" color={colors.text2} />
        </View>

        {/* Barra de tempo na meta */}
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${inTargetPct}%` as `${number}%` }]} />
        </View>
        <Text style={styles.barLabel}>{inTargetPct}% na faixa {targetMin}–{targetMax} mg/dL</Text>
      </Card>

      {/* Seletor de período */}
      <Card>
        <View style={styles.sectionRow}>
          <Icon name="calendar" size={16} color={colors.text2} />
          <Text style={styles.sectionTitle}>Período do relatório</Text>
        </View>
        <View style={styles.periodRow}>
          {(['semana', 'mes', 'tudo'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'semana' ? '7 dias' : p === 'mes' ? '30 dias' : 'Tudo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.periodHint}>
          {PERIOD_LABELS[period]}: {glucose.length} glicemias · {insulin.length} insulinas · {meals.length} refeições
        </Text>
      </Card>

      {/* Gerar PDF */}
      {generating ? (
        <View style={styles.generatingRow}>
          <ActivityIndicator size="small" color={colors.red} />
          <Text style={styles.generatingText}>Gerando PDF com análise da IA...</Text>
        </View>
      ) : (
        <Button
          title="Gerar e compartilhar PDF"
          onPress={handleGenerate}
          disabled={glucose.length === 0}
        />
      )}

      {/* Histórico de relatórios */}
      <Card>
        <TouchableOpacity
          style={styles.sectionRow}
          onPress={() => setShowHistory(v => !v)}
        >
          <Icon name="clipboard" size={16} color={colors.text2} />
          <Text style={styles.sectionTitle}>Histórico ({history.length})</Text>
          <Icon name={showHistory ? 'close' : 'add'} size={16} color={colors.text2} />
        </TouchableOpacity>

        {showHistory && (
          history.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum relatório gerado ainda.</Text>
          ) : (
            history.map(r => (
              <TouchableOpacity key={r.id} style={styles.historyItem} onPress={() => reopenRecord(r)} disabled={generating}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>
                    {new Date(r.generated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                  <Text style={styles.historyPeriod}>{PERIOD_LABELS[r.period]} · {r.readings_count} medições</Text>
                </View>
                <View style={styles.historyRight}>
                  <View style={[styles.historyBadge, { backgroundColor: r.in_target_pct >= 70 ? colors.mint : colors.rose }]}>
                    <Text style={[styles.historyBadgeText, { color: r.in_target_pct >= 70 ? '#1E8449' : colors.red }]}>
                      {r.in_target_pct}% meta
                    </Text>
                  </View>
                  <View style={styles.historyOpen}>
                    <Icon name="document" size={12} color={colors.red} />
                    <Text style={styles.historyOpenText}>Abrir PDF</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )
        )}
      </Card>
    </ScrollView>
  );
}

function StatBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      {unit ? <Text style={statStyles.unit}>{unit}</Text> : null}
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { alignItems: 'center', flex: 1 },
  value: { fontSize: 22, fontWeight: '800' },
  unit: { fontSize: 10, color: colors.text3 },
  label: { fontSize: 11, color: colors.text3, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 12, borderRadius: radius.lg,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  barBg: { height: 10, backgroundColor: '#F0F0F0', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: colors.green, borderRadius: 6 },
  barLabel: { fontSize: 12, color: colors.text3, marginTop: 6, textAlign: 'center' },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm,
    borderWidth: 2, borderColor: colors.border,
  },
  periodBtnActive: { borderColor: colors.red, backgroundColor: colors.rose },
  periodText: { fontSize: 13, fontWeight: '600', color: colors.text2 },
  periodTextActive: { color: colors.red },
  periodHint: { fontSize: 12, color: colors.text3, marginTop: 10, textAlign: 'center' },
  generatingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    justifyContent: 'center', paddingVertical: 16,
  },
  generatingText: { fontSize: 14, color: colors.red },
  emptyText: { fontSize: 13, color: colors.text3, textAlign: 'center', paddingVertical: 8 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  historyLeft: { flex: 1 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyDate: { fontSize: 14, fontWeight: '700', color: colors.text },
  historyPeriod: { fontSize: 12, color: colors.text3, marginTop: 2 },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  historyBadgeText: { fontSize: 11, fontWeight: '700' },
  historyOpen: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  historyOpenText: { fontSize: 11, fontWeight: '700', color: colors.red },
});
