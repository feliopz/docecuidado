import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../constants/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import Icon from '../components/Icon';
import ScrollPicker from '../components/ScrollPicker';
import { setActiveChildId, getAccountId, getAccountName } from '../lib/store';
import { upsertChild, ensureResponsibleCaregiver } from '../lib/supabase-db';
import { genId } from '../lib/id';
import {
  InsulinType,
  INSULIN_LABELS,
  Diagnosis,
  DIAGNOSIS_LABELS,
  Allergen,
  ALLERGEN_LABELS,
} from '../types';

const DIAGNOSIS_OPTIONS: { key: Diagnosis; label: string }[] = [
  { key: 'dm1', label: 'Tipo 1' },
  { key: 'dm2', label: 'Tipo 2' },
  { key: 'outro', label: 'Outro' },
  { key: 'nao_sei', label: 'Não sei' },
];

const ALLERGEN_OPTIONS = Object.entries(ALLERGEN_LABELS) as [Allergen, string][];

export default function NovaCrianca() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl' | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis>('dm1');
  const [insulinTypes, setInsulinTypes] = useState<InsulinType[]>([]);
  const [targetMin, setTargetMin] = useState(70);
  const [targetMax, setTargetMax] = useState(180);
  const [allergies, setAllergies] = useState<Allergen[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleInsulin = (type: InsulinType) => {
    setInsulinTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  };

  const toggleAllergy = (a: Allergen) =>
    setAllergies(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const child = {
      id: genId(),
      name: name.trim(),
      diagnosis,
      allergies,
      insulin_types: insulinTypes.length > 0 ? insulinTypes : ['rápida' as InsulinType],
      glucose_target_min: targetMin,
      glucose_target_max: targetMax,
      gender: gender ?? undefined,
    };
    await upsertChild(child);
    await setActiveChildId(child.id);
    const [accId, accName] = await Promise.all([getAccountId(), getAccountName()]);
    await ensureResponsibleCaregiver(child.id, accId, accName || 'Responsável');
    router.replace('/(tabs)');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="back" size={22} color={colors.text2} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova criança</Text>
        <View style={{ width: 40 }} />
      </View>

      <Card>
        <Text style={styles.label}>Nome ou apelido</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome da criança"
          placeholderTextColor={colors.text3}
          autoFocus
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Menino ou menina?</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderBtn, gender === 'boy' && styles.genderSelected]}
            onPress={() => setGender('boy')}
          >
            <Icon name="male" size={28} color={gender === 'boy' ? colors.red : colors.text2} />
            <Text style={[styles.genderLabel, gender === 'boy' && { color: colors.red }]}>Menino</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderBtn, gender === 'girl' && styles.genderSelected]}
            onPress={() => setGender('girl')}
          >
            <Icon name="female" size={28} color={gender === 'girl' ? colors.red : colors.text2} />
            <Text style={[styles.genderLabel, gender === 'girl' && { color: colors.red }]}>Menina</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Diagnóstico</Text>
        <View style={styles.chips}>
          {DIAGNOSIS_OPTIONS.map(({ key, label }) => (
            <Chip key={key} icon="glucose" label={label} selected={diagnosis === key} onPress={() => setDiagnosis(key)} />
          ))}
        </View>
        <Text style={styles.diagPreview}>{DIAGNOSIS_LABELS[diagnosis]}</Text>

        <Text style={[styles.label, { marginTop: 16 }]}>Alergias alimentares</Text>
        <View style={styles.chips}>
          {ALLERGEN_OPTIONS.map(([key, label]) => (
            <Chip key={key} icon="warning" label={label} selected={allergies.includes(key)} onPress={() => toggleAllergy(key)} />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Insulinas usadas</Text>
        <View style={styles.chips}>
          {(Object.entries(INSULIN_LABELS) as [InsulinType, { icon: string; label: string }][]).map(
            ([key, { icon, label }]) => (
              <Chip key={key} icon={icon} label={label} selected={insulinTypes.includes(key)} onPress={() => toggleInsulin(key)} />
            ),
          )}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Metas de glicemia (mg/dL)</Text>
        <View style={styles.pickersRow}>
          <View style={styles.pickerWrap}>
            <Text style={[styles.pickerLabel, { color: colors.green }]}>Mínimo</Text>
            <ScrollPicker min={50} max={120} step={5} value={targetMin} onChange={setTargetMin} color={colors.green} />
          </View>
          <View style={styles.pickerDivider} />
          <View style={styles.pickerWrap}>
            <Text style={[styles.pickerLabel, { color: colors.red }]}>Máximo</Text>
            <ScrollPicker min={120} max={300} step={5} value={targetMax} onChange={setTargetMax} color={colors.red} />
          </View>
        </View>

        <Button
          title={saving ? 'Salvando...' : 'Adicionar criança'}
          onPress={save}
          disabled={!name.trim() || saving}
          style={{ marginTop: 16 }}
        />
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
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 8 },
  input: {
    padding: 14, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.md, fontSize: fontSize.md,
    backgroundColor: '#F8F9FA', color: colors.text,
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, gap: 6,
  },
  genderSelected: { borderColor: colors.red, backgroundColor: '#FDEDEC' },
  genderLabel: { fontSize: 14, fontWeight: '600', color: colors.text2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diagPreview: { fontSize: 13, color: colors.text3, marginTop: 8 },
  pickersRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  pickerWrap: { flex: 1, alignItems: 'center', gap: 4 },
  pickerLabel: { fontSize: 13, fontWeight: '700' },
  pickerDivider: { width: 2, backgroundColor: colors.border, alignSelf: 'stretch', marginHorizontal: 8, marginTop: 24 },
});
