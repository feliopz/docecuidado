import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../../constants/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import Icon from '../../components/Icon';
import {
  getLinkedChildren, getActiveChildId, setActiveChildId, getChildById,
  getAccountName, addLinkedChild, saveChildById,
  LinkedChild,
} from '../../lib/store';
import { fetchGlucoseReadingsDB, redeemInviteCode, fetchChildById } from '../../lib/supabase-db';
import { Child, getGlucoseStatus } from '../../types';

interface PatientStat {
  child: LinkedChild;
  full: Child | null;
  last: number | null;
  status: 'green' | 'yellow' | 'red' | null;
  count: number;
  inRangePct: number;
}

export default function Pacientes() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<PatientStat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [linked, active] = await Promise.all([getLinkedChildren(), getActiveChildId()]);
    setActiveId(active);
    const result: PatientStat[] = await Promise.all(
      linked.map(async lc => {
        const [full, readings] = await Promise.all([getChildById(lc.id), fetchGlucoseReadingsDB(lc.id)]);
        const min = full?.glucose_target_min ?? 70;
        const max = full?.glucose_target_max ?? 180;
        const last = readings[0]?.reading_value ?? null;
        const inRange = readings.filter(r => r.reading_value >= min && r.reading_value <= max).length;
        return {
          child: lc,
          full,
          last,
          status: last != null ? getGlucoseStatus(last, min, max) : null,
          count: readings.length,
          inRangePct: readings.length ? Math.round((inRange / readings.length) * 100) : 0,
        };
      }),
    );
    setStats(result);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const open = async (id: string) => {
    await setActiveChildId(id);
    router.push('/(tabs)/dados');
  };

  const handleAdd = async () => {
    if (code.trim().length !== 6) return;
    setAdding(true);
    setErr('');
    const accName = await getAccountName();
    const childId = await redeemInviteCode(code.trim().toUpperCase(), accName, 'medico');
    if (!childId) { setErr('Código inválido ou já utilizado.'); setAdding(false); return; }
    const childData = await fetchChildById(childId);
    if (!childData) { setErr('Não foi possível carregar os dados.'); setAdding(false); return; }
    await saveChildById(childData);
    await addLinkedChild({ id: childId, name: childData.name, gender: childData.gender, role: 'medico' });
    setCode('');
    setShowAdd(false);
    setAdding(false);
    Alert.alert('Paciente vinculado', `${childData.name} foi adicionado à sua lista.`);
    load();
  };

  const dot = (s: PatientStat['status']) =>
    s === 'green' ? colors.green : s === 'yellow' ? colors.yellow : s === 'red' ? colors.red : colors.text3;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.topbar}>
        <View style={styles.titleRow}>
          <Icon name="medkit" size={20} color={colors.red} />
          <Text style={styles.title}>Meus Pacientes</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{stats.length}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.red} style={{ marginTop: 40 }} />
      ) : stats.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="people" size={48} color={colors.text3} />
          <Text style={styles.emptyTitle}>Nenhum paciente vinculado</Text>
          <Text style={styles.emptyText}>Adicione um paciente usando o código fornecido pela família.</Text>
        </View>
      ) : (
        stats.map(s => (
          <TouchableOpacity key={s.child.id} onPress={() => open(s.child.id)}>
            <Card style={[styles.patientCard, s.child.id === activeId ? styles.patientActive : null]}>
              <View style={[styles.statusDot, { backgroundColor: dot(s.status) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{s.child.name}</Text>
                <Text style={styles.patientMeta}>
                  {s.count} registros · {s.inRangePct}% na meta
                </Text>
              </View>
              <View style={styles.patientRight}>
                <Text style={[styles.patientValue, { color: dot(s.status) }]}>
                  {s.last != null ? s.last : '—'}
                </Text>
                <Text style={styles.patientUnit}>mg/dL</Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.text3} />
            </Card>
          </TouchableOpacity>
        ))
      )}

      {showAdd ? (
        <Card>
          <Text style={styles.addLabel}>Código de convite do paciente</Text>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={v => { setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '')); setErr(''); }}
            placeholder="CÓDIGO"
            placeholderTextColor={colors.text3}
            autoCapitalize="characters"
            maxLength={6}
          />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          {adding ? <ActivityIndicator color={colors.red} style={{ marginTop: 8 }} /> : (
            <View style={styles.addActions}>
              <Button title="Cancelar" variant="outline" onPress={() => setShowAdd(false)} style={{ flex: 1 }} />
              <Button title="Vincular" onPress={handleAdd} disabled={code.length !== 6} style={{ flex: 1 }} />
            </View>
          )}
        </Card>
      ) : (
        <Button title="Adicionar paciente" onPress={() => setShowAdd(true)} style={{ marginTop: 8 }} />
      )}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  countBadge: { backgroundColor: colors.rose, borderRadius: 14, minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { fontSize: 14, fontWeight: '800', color: colors.red },
  patientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  patientActive: { borderWidth: 2, borderColor: colors.red },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  patientName: { fontSize: 16, fontWeight: '700', color: colors.text },
  patientMeta: { fontSize: 12, color: colors.text3, marginTop: 2 },
  patientRight: { alignItems: 'flex-end' },
  patientValue: { fontSize: 22, fontWeight: '900' },
  patientUnit: { fontSize: 10, color: colors.text3 },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: fontSize.sm, color: colors.text2, textAlign: 'center', paddingHorizontal: 20 },
  addLabel: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 8 },
  codeInput: {
    padding: 14, borderWidth: 2, borderColor: colors.red, borderRadius: radius.md,
    fontSize: 24, fontWeight: '900', letterSpacing: 8, textAlign: 'center',
    backgroundColor: colors.rose, color: colors.text,
  },
  err: { fontSize: 12, color: colors.red, textAlign: 'center', marginTop: 8 },
  addActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
