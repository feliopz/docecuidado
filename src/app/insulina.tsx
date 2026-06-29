import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../constants/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import Icon from '../components/Icon';
import { addInsulinLogDB } from '../lib/supabase-db';
import { getChild, getRecorderName } from '../lib/store';
import { InsulinType, INSULIN_LABELS } from '../types';

type Step = 'input' | 'confirm' | 'done';

export default function Insulina() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('input');
  const [type, setType] = useState<InsulinType | null>(null);
  const [dose, setDose] = useState('');

  const confirm = () => {
    if (!type || !parseInt(dose, 10)) return;
    setStep('confirm');
  };

  const save = async () => {
    const [child, recorder] = await Promise.all([getChild(), getRecorderName()]);
    await addInsulinLogDB({
      id: Date.now().toString(),
      child_id: child?.id ?? 'local',
      insulin_type: type!,
      dose_units: parseInt(dose, 10),
      applied_time: new Date().toISOString(),
      recorded_by: recorder,
      created_at: new Date().toISOString(),
    });
    setStep('done');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="back" size={22} color={colors.text2} />
        </TouchableOpacity>
        <Text style={styles.title}>Registrar Insulina</Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'input' && (
        <Card>
          <Text style={styles.label}>Tipo de insulina</Text>
          <View style={styles.chips}>
            {(Object.entries(INSULIN_LABELS) as [InsulinType, { icon: string; label: string }][]).map(
              ([key, { icon, label }]) => (
                <Chip
                  key={key}
                  icon={icon}
                  label={label}
                  selected={type === key}
                  onPress={() => setType(key)}
                />
              ),
            )}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Dose (unidades)</Text>
          <TextInput
            style={styles.numInput}
            value={dose}
            onChangeText={setDose}
            keyboardType="numeric"
            placeholder="00"
            placeholderTextColor={colors.text3}
            maxLength={3}
          />

          <Button
            title="Continuar"
            onPress={confirm}
            disabled={!type || !parseInt(dose, 10)}
            style={{ marginTop: 16 }}
          />
        </Card>
      )}

      {step === 'confirm' && (
        <View style={styles.confirmScreen}>
          <Icon name="warning-active" size={56} color={colors.yellow} />
          <Text style={styles.confirmTitle}>Confirme com atenção</Text>
          <Text style={styles.confirmSubtitle}>Você vai registrar:</Text>
          <Text style={styles.confirmValue}>
            {dose} unidades de insulina {INSULIN_LABELS[type!]?.label.toLowerCase()}
          </Text>
          <Text style={styles.confirmNote}>
            Depois de confirmar, o registro fica salvo no histórico.
          </Text>
          <View style={styles.row}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={() => setStep('input')}
              style={{ flex: 1 }}
            />
            <Button
              title="Confirmo"
              onPress={save}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}

      {step === 'done' && (
        <View style={styles.doneScreen}>
          <Icon name="insulin" size={64} color={colors.green} />
          <Text style={styles.doneTitle}>Insulina registrada!</Text>
          <Text style={styles.doneValue}>
            {dose}u {INSULIN_LABELS[type!]?.label}
          </Text>
          <Text style={styles.doneHint}>
            Lembrete: a próxima medição e em 2h.
          </Text>
          <Button
            title="Voltar ao início"
            onPress={() => router.replace('/(tabs)')}
            style={{ marginTop: 16 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
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
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  numInput: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#F8F9FA',
    color: colors.text,
    letterSpacing: 4,
  },
  confirmScreen: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  confirmTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  confirmSubtitle: { fontSize: 15, color: colors.text2 },
  confirmValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.red, marginVertical: 4 },
  confirmNote: { fontSize: 13, color: colors.text3, textAlign: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10, width: '100%' },
  doneScreen: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  doneTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  doneValue: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.red },
  doneHint: { fontSize: 14, color: colors.text2 },
});
