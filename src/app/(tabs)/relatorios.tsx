import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../../constants/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import ChildSwitcher from '../../components/ChildSwitcher';
import Icon from '../../components/Icon';
import { getChild, getLinkedChildren, getActiveChildId, getAccountType, getReportHistory, ReportRecord, LinkedChild } from '../../lib/store';
import { Child, AccountType } from '../../types';

const PERIOD_LABELS: Record<ReportRecord['period'], string> = {
  semana: 'Última semana',
  mes: 'Último mês',
  tudo: 'Todo o período',
};

export default function Relatorios() {
  const insets = useSafeAreaInsets();
  const [child, setChild] = useState<Child | null>(null);
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [linked, setLinked] = useState<LinkedChild[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('medico');

  const load = useCallback(async () => {
    const [c, h, lk, act, at] = await Promise.all([
      getChild(), getReportHistory(), getLinkedChildren(), getActiveChildId(), getAccountType(),
    ]);
    setChild(c); setHistory(h); setLinked(lk); setActiveChildId(act); setAccountType(at);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.topbar}>
        {linked.length > 0 ? (
          <ChildSwitcher children={linked} activeChildId={activeChildId} accountType={accountType} onChange={load} />
        ) : (
          <Text style={styles.title}>Relatórios</Text>
        )}
      </View>

      <Card style={{ alignItems: 'center' }}>
        <Icon name="document" size={44} color={colors.red} />
        <Text style={styles.heroTitle}>Relatório clínico de {child?.name ?? 'paciente'}</Text>
        <Text style={styles.heroText}>
          Gere um PDF com métricas glicêmicas, tempo no alvo, tratamento e análise — pronto para a consulta.
        </Text>
        <Button title="Gerar / abrir relatórios" onPress={() => router.push('/relatorio')} style={{ marginTop: 12, alignSelf: 'stretch' }} />
      </Card>

      <Card>
        <View style={styles.sectionRow}>
          <Icon name="clipboard" size={16} color={colors.text2} />
          <Text style={styles.sectionTitle}>Histórico ({history.length})</Text>
        </View>
        {history.length === 0 ? (
          <Text style={styles.empty}>Nenhum relatório gerado ainda.</Text>
        ) : (
          history.slice(0, 10).map(r => (
            <TouchableOpacity key={r.id} style={styles.row} onPress={() => router.push('/relatorio')}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowDate}>
                  {new Date(r.generated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
                <Text style={styles.rowMeta}>{r.child_name} · {PERIOD_LABELS[r.period]} · {r.readings_count} medições</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: r.in_target_pct >= 70 ? colors.mint : colors.rose }]}>
                <Text style={[styles.badgeText, { color: r.in_target_pct >= 70 ? '#1E8449' : colors.red }]}>{r.in_target_pct}%</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.text3} />
            </TouchableOpacity>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 12, borderRadius: radius.lg,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  heroTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 10, textAlign: 'center' },
  heroText: { fontSize: 13, color: colors.text2, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  empty: { fontSize: 13, color: colors.text3, textAlign: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowDate: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.text3, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
