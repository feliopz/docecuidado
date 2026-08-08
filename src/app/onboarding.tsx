import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../constants/theme';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import Icon from '../components/Icon';
import ScrollPicker from '../components/ScrollPicker';
import { genId } from '../lib/id';
import {
  setOnboarded,
  saveCaregiverRole,
  addLinkedChild,
  setActiveChildId,
  saveChildById,
  setAccountType,
  setAccountName,
  getAccountId,
  setAIConsent,
} from '../lib/store';
import {
  upsertChild,
  redeemInviteCode,
  fetchChildById,
  ensureResponsibleCaregiver,
} from '../lib/supabase-db';

const PRIVACY_URL = 'https://docecuidado.com/privacidade';
import {
  InsulinType,
  INSULIN_LABELS,
  CAREGIVER_RELATIONSHIPS,
  Diagnosis,
  DIAGNOSIS_LABELS,
} from '../types';
import {
  requestNotificationPermission,
  setNotificationsEnabled,
  GLUCOSE_REMINDER_SLOTS,
} from '../lib/notifications';

type Flow = 'choose' | 'parent' | 'caregiver';
type CgRole = 'cuidador' | 'medico';

const PARENT_STEPS = 9;
const CAREGIVER_STEPS = 3;

const DIAGNOSIS_OPTIONS: { key: Diagnosis; icon: string; label: string }[] = [
  { key: 'dm1', icon: 'glucose', label: 'Tipo 1' },
  { key: 'dm2', icon: 'glucose', label: 'Tipo 2' },
  { key: 'outro', icon: 'help', label: 'Outro' },
  { key: 'nao_sei', icon: 'help', label: 'Não sei' },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [flow, setFlow] = useState<Flow>('choose');
  const [step, setStep] = useState(0);
  // Stable child id for the whole onboarding: prevents a second "Criança" being
  // created if finishAsParent runs more than once (double tap / notification
  // dialog re-entry). Combined with the `finishingRef` guard below.
  const childIdRef = useRef(genId());
  const finishingRef = useRef(false);

  // Parent flow state
  const [childName, setChildName] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl' | null>(null);
  const [caregiverRole, setCaregiverRole] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis>('dm1');
  const [insulinTypes, setInsulinTypes] = useState<InsulinType[]>([]);
  const [targetMin, setTargetMin] = useState(70);
  const [targetMax, setTargetMax] = useState(180);
  const [aiConsent, setAiConsent] = useState(false);

  // Caregiver flow state
  const [cgRole, setCgRole] = useState<CgRole>('cuidador');
  const [cgName, setCgName] = useState('');
  const [cgCode, setCgCode] = useState('');
  const [cgLoading, setCgLoading] = useState(false);
  const [cgError, setCgError] = useState('');

  const totalSteps = flow === 'caregiver' ? CAREGIVER_STEPS : PARENT_STEPS;

  const toggleInsulin = (type: InsulinType) => {
    setInsulinTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  };

  const finishAsParent = async (enableNotifications = false) => {
    if (finishingRef.current) return; // guard against double submit
    finishingRef.current = true;
    try {
      const child = {
        id: childIdRef.current,
        name: childName.trim() || 'Criança',
        diagnosis,
        insulin_types: insulinTypes.length > 0 ? insulinTypes : ['rápida' as InsulinType],
        glucose_target_min: targetMin,
        glucose_target_max: targetMax,
        gender: gender ?? undefined,
      };
      const relLabel = CAREGIVER_RELATIONSHIPS[caregiverRole]?.label ?? 'Responsável';
      await setAccountType('responsavel');
      await setAccountName(relLabel);
      await setAIConsent(aiConsent);
      await upsertChild(child);
      if (caregiverRole) await saveCaregiverRole(caregiverRole);
      const accId = await getAccountId();
      await ensureResponsibleCaregiver(child.id, accId, relLabel);
      await setOnboarded(true);

      if (enableNotifications) {
        const granted = await requestNotificationPermission();
        if (!granted) await setNotificationsEnabled(false);
      }

      router.replace('/(tabs)');
    } finally {
      finishingRef.current = false;
    }
  };

  const finishAsCaregiver = async () => {
    if (!cgName.trim() || cgCode.trim().length !== 6) return;
    setCgLoading(true);
    setCgError('');

    const role = cgRole === 'medico' ? 'medico' : 'caregiver';
    const childId = await redeemInviteCode(cgCode.trim().toUpperCase(), cgName.trim(), role);
    if (!childId) {
      setCgError('Código inválido ou já utilizado. Peça um novo código ao responsável.');
      setCgLoading(false);
      return;
    }

    const childData = await fetchChildById(childId);
    if (!childData) {
      setCgError('Não foi possível carregar os dados. Verifique sua conexão e tente novamente.');
      setCgLoading(false);
      return;
    }

    await setAccountType(cgRole);
    await setAccountName(cgName.trim());
    await saveChildById(childData);
    await addLinkedChild({ id: childId, name: childData.name, gender: childData.gender, role: cgRole === 'medico' ? 'medico' : 'caregiver' });
    await setActiveChildId(childId);
    await setOnboarded(true);

    router.replace('/(tabs)');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* Step 0: Welcome */}
      {step === 0 && (
        <View style={styles.step}>
          <Icon name="heart-active" size={72} color={colors.red} />
          <Text style={styles.title}>Bem-vindo ao{'\n'}Doce Cuidado</Text>
          <Text style={styles.subtitle}>
            Um companheiro para cuidar de quem você ama, com calma e carinho.
          </Text>
          <Dots current={0} total={totalSteps} />
          <Button title="Começar" onPress={() => setStep(1)} />
        </View>
      )}

      {/* Step 1: Role choice */}
      {step === 1 && flow === 'choose' && (
        <View style={styles.step}>
          <Icon name="people-active" size={64} color={colors.red} />
          <Text style={styles.title}>Como você vai usar{'\n'}o Doce Cuidado?</Text>
          <Dots current={1} total={totalSteps} />

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => { setFlow('parent'); setStep(2); }}
          >
            <Icon name="person-add" size={36} color={colors.red} />
            <View style={{ flex: 1 }}>
              <Text style={styles.roleTitle}>Registrar minha criança</Text>
              <Text style={styles.roleHint}>
                Sou pai, mãe ou responsável e quero cadastrar a criança agora
              </Text>
            </View>
            <Icon name="back" size={18} color={colors.red} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleLinkBtn}
            onPress={() => { setFlow('caregiver'); setCgRole('cuidador'); setStep(2); }}
          >
            <Icon name="people" size={16} color={colors.text3} />
            <Text style={styles.roleLinkText}>Sou cuidador(a) — tenho um código</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleLinkBtn}
            onPress={() => { setFlow('caregiver'); setCgRole('medico'); setStep(2); }}
          >
            <Icon name="medkit" size={16} color={colors.text3} />
            <Text style={styles.roleLinkText}>Sou médico(a)/profissional — tenho um código</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Parent flow: Step 2 — Child name */}
      {step === 2 && flow === 'parent' && (
        <View style={styles.step}>
          <Icon name="person-add" size={64} color={colors.red} />
          <Text style={styles.title}>Quem vamos cuidar?</Text>
          <Text style={styles.subtitle}>Conte um pouquinho sobre a criança</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome ou apelido"
            value={childName}
            onChangeText={setChildName}
            placeholderTextColor={colors.text3}
            autoFocus
          />
          <Dots current={2} total={PARENT_STEPS} />
          <Button
            title="Continuar"
            onPress={() => setStep(3)}
            disabled={!childName.trim()}
          />
        </View>
      )}

      {/* Parent flow: Step 3 — Gender */}
      {step === 3 && flow === 'parent' && (
        <View style={styles.step}>
          <Icon name="people-active" size={64} color={colors.red} />
          <Text style={styles.title}>
            {childName || 'A criança'} é{'\n'}menino ou menina?
          </Text>
          <Text style={styles.subtitle}>Isso ajuda a personalizar o app</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'boy' && styles.genderSelected]}
              onPress={() => setGender('boy')}
            >
              <Icon name="male" size={40} color={gender === 'boy' ? colors.red : colors.text2} />
              <Text style={[styles.genderLabel, gender === 'boy' && styles.genderLabelSelected]}>
                Menino
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'girl' && styles.genderSelected]}
              onPress={() => setGender('girl')}
            >
              <Icon name="female" size={40} color={gender === 'girl' ? colors.red : colors.text2} />
              <Text style={[styles.genderLabel, gender === 'girl' && styles.genderLabelSelected]}>
                Menina
              </Text>
            </TouchableOpacity>
          </View>
          <Dots current={3} total={PARENT_STEPS} />
          <Button title="Continuar" onPress={() => setStep(4)} />
          <TouchableOpacity onPress={() => setStep(4)} style={styles.skipLink}>
            <Text style={styles.skipText}>Prefiro não dizer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Parent flow: Step 4 — Caregiver role */}
      {step === 4 && flow === 'parent' && (
        <View style={styles.step}>
          <Icon name="heart-active" size={64} color={colors.red} />
          <Text style={styles.title}>Quem é você?</Text>
          <Text style={styles.subtitle}>Selecione seu papel no cuidado</Text>
          <View style={styles.chips}>
            {Object.entries(CAREGIVER_RELATIONSHIPS).map(([key, { icon, label }]) => (
              <Chip
                key={key}
                icon={icon}
                label={label}
                selected={caregiverRole === key}
                onPress={() => setCaregiverRole(key)}
              />
            ))}
          </View>
          <Dots current={4} total={PARENT_STEPS} />
          <Button
            title="Continuar"
            onPress={() => setStep(5)}
            disabled={!caregiverRole}
          />
        </View>
      )}

      {/* Parent flow: Step 5 — Diagnosis */}
      {step === 5 && flow === 'parent' && (
        <View style={styles.step}>
          <Icon name="glucose" size={64} color={colors.red} />
          <Text style={styles.title}>
            Qual o diagnóstico{'\n'}de {childName || 'a criança'}?
          </Text>
          <Text style={styles.subtitle}>Você pode ajustar depois, no perfil</Text>
          <View style={styles.chips}>
            {DIAGNOSIS_OPTIONS.map(({ key, icon, label }) => (
              <Chip
                key={key}
                icon={icon}
                label={label}
                selected={diagnosis === key}
                onPress={() => setDiagnosis(key)}
              />
            ))}
          </View>
          <Text style={styles.diagPreview}>{DIAGNOSIS_LABELS[diagnosis]}</Text>
          <Dots current={5} total={PARENT_STEPS} />
          <Button title="Continuar" onPress={() => setStep(6)} />
        </View>
      )}

      {/* Parent flow: Step 6 — Insulin types */}
      {step === 6 && flow === 'parent' && (
        <View style={styles.step}>
          <Icon name="insulin" size={64} color={colors.red} />
          <Text style={styles.title}>
            Quais insulinas{'\n'}{childName || 'a criança'} usa?
          </Text>
          <Text style={styles.subtitle}>Pode marcar mais de uma. Ajuste depois.</Text>
          <View style={styles.chips}>
            {(Object.entries(INSULIN_LABELS) as [InsulinType, { icon: string; label: string }][]).map(
              ([key, { icon, label }]) => (
                <Chip
                  key={key}
                  icon={icon}
                  label={label}
                  selected={insulinTypes.includes(key)}
                  onPress={() => toggleInsulin(key)}
                />
              ),
            )}
          </View>
          <Dots current={6} total={PARENT_STEPS} />
          <Button title="Continuar" onPress={() => setStep(7)} />
        </View>
      )}

      {/* Parent flow: Step 7 — Glucose targets */}
      {step === 7 && flow === 'parent' && (
        <View style={styles.step}>
          <Icon name="flag" size={64} color={colors.red} />
          <Text style={styles.title}>
            Metas de {childName || 'glicemia'}
          </Text>
          <Text style={styles.hint}>
            Esses números o médico que passa.
          </Text>
          <View style={styles.pickersRow}>
            <View style={styles.pickerWrap}>
              <Text style={[styles.pickerLabel, { color: colors.green }]}>Mínimo</Text>
              <ScrollPicker
                min={50}
                max={120}
                step={5}
                value={targetMin}
                onChange={setTargetMin}
                color={colors.green}
              />
            </View>
            <View style={styles.pickerDivider} />
            <View style={styles.pickerWrap}>
              <Text style={[styles.pickerLabel, { color: colors.red }]}>Máximo</Text>
              <ScrollPicker
                min={120}
                max={300}
                step={5}
                value={targetMax}
                onChange={setTargetMax}
                color={colors.red}
              />
            </View>
          </View>
          <Text style={styles.targetPreview}>
            {targetMin} — {targetMax} mg/dL
          </Text>
          <Dots current={7} total={PARENT_STEPS} />
          <Button title="Continuar" onPress={() => setStep(8)} />
        </View>
      )}

      {/* Parent flow: Step 8 — Notification opt-in */}
      {step === 8 && flow === 'parent' && (
        <View style={styles.step}>
          <Icon name="notifications-active" size={64} color={colors.mint2} />
          <Text style={styles.title}>Lembretes gentis?</Text>
          <Text style={styles.subtitle}>
            A Gotinha pode te avisar nos momentos mais importantes do dia para registrar a glicemia de {childName || 'sua criança'}.
          </Text>
          <View style={styles.reminderList}>
            {GLUCOSE_REMINDER_SLOTS.map(slot => (
              <View key={slot.id} style={styles.reminderRow}>
                <Icon name="clock" size={14} color={colors.text3} />
                <Text style={styles.reminderText}>
                  {String(slot.hour).padStart(2, '0')}:{String(slot.minute).padStart(2, '0')} — {slot.label}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>Você pode desativar a qualquer momento no Perfil.</Text>

          {/* LGPD — opt-in consent for third-party AI processing */}
          <TouchableOpacity
            style={styles.consentRow}
            activeOpacity={0.7}
            onPress={() => setAiConsent(v => !v)}
          >
            <View style={[styles.checkbox, aiConsent && styles.checkboxChecked]}>
              {aiConsent && <Icon name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.consentText}>
              Autorizo o uso de inteligência artificial para gerar dicas e análises
              personalizadas. Apenas o primeiro nome e os dados estritamente
              necessários são enviados ao serviço de IA.{' '}
              <Text style={styles.consentLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                Ler a Política de Privacidade
              </Text>
              .
            </Text>
          </TouchableOpacity>

          <Dots current={8} total={PARENT_STEPS} />
          <Button title="Ativar lembretes" onPress={() => finishAsParent(true)} />
          <TouchableOpacity onPress={() => finishAsParent(false)} style={styles.skipLink}>
            <Text style={styles.skipText}>Agora não</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Caregiver flow: Step 2 — Name + Code */}
      {step === 2 && flow === 'caregiver' && (
        <View style={styles.step}>
          <Icon name={cgRole === 'medico' ? 'medkit' : 'people-active'} size={64} color={colors.text2} />
          <Text style={styles.title}>
            {cgRole === 'medico' ? 'Conta de profissional' : 'Entrar como cuidador'}
          </Text>
          <Text style={styles.subtitle}>
            {cgRole === 'medico'
              ? 'Acompanhe seus pacientes com uma visão especializada. Insira o código fornecido pela família.'
              : 'Insira o código de convite gerado pelo responsável da criança.'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={cgRole === 'medico' ? 'Seu nome (Dr. / Dra.)' : 'Seu nome'}
            value={cgName}
            onChangeText={setCgName}
            autoCapitalize="words"
            placeholderTextColor={colors.text3}
          />

          <View style={styles.codeWrap}>
            <TextInput
              style={styles.codeInput}
              placeholder="CÓDIGO"
              value={cgCode}
              onChangeText={v => {
                setCgCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setCgError('');
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              placeholderTextColor={colors.text3}
            />
            <Text style={styles.codeHint}>Código de 6 caracteres gerado pelo responsável</Text>
          </View>

          {cgError ? <Text style={styles.errorText}>{cgError}</Text> : null}

          <Dots current={2} total={CAREGIVER_STEPS} />

          {cgLoading ? (
            <ActivityIndicator size="large" color={colors.red} style={{ marginTop: 8 }} />
          ) : (
            <Button
              title="Entrar"
              onPress={finishAsCaregiver}
              disabled={!cgName.trim() || cgCode.length !== 6}
            />
          )}

          <TouchableOpacity
            onPress={() => { setFlow('choose'); setStep(1); setCgError(''); }}
            style={styles.skipLink}
          >
            <Text style={styles.skipText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  step: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.text2, textAlign: 'center', lineHeight: 21 },
  hint: { fontSize: 13, color: colors.text3, textAlign: 'center' },
  input: {
    width: '100%', padding: 14, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.md, fontSize: fontSize.md, backgroundColor: '#F8F9FA',
    color: colors.text, textAlign: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  diagPreview: { fontSize: 14, fontWeight: '600', color: colors.text2 },
  genderRow: { flexDirection: 'row', gap: 16, marginVertical: 8 },
  genderBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 20, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, gap: 8,
  },
  genderSelected: { borderColor: colors.red, backgroundColor: '#FDEDEC' },
  genderLabel: { fontSize: 15, fontWeight: '600', color: colors.text2 },
  genderLabelSelected: { color: colors.red },
  pickersRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 8, gap: 0 },
  pickerWrap: { flex: 1, alignItems: 'center', gap: 4 },
  pickerLabel: { fontSize: 13, fontWeight: '700' },
  pickerDivider: {
    width: 2, backgroundColor: colors.border, alignSelf: 'stretch',
    marginHorizontal: 8, marginTop: 24,
  },
  targetPreview: { fontSize: 18, fontWeight: '700', color: colors.text },
  skipLink: { paddingVertical: 8 },
  skipText: { fontSize: 13, color: colors.text3 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDD' },
  dotActive: { backgroundColor: colors.red, width: 24, borderRadius: 4 },
  roleCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 18,
    borderWidth: 2, borderColor: colors.red,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  roleTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  roleHint: { fontSize: 13, color: colors.text2, lineHeight: 18 },
  roleLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  roleLinkText: { fontSize: 13, color: colors.text3 },
  codeWrap: { width: '100%', gap: 6 },
  codeInput: {
    width: '100%', padding: 16, borderWidth: 2, borderColor: colors.red,
    borderRadius: radius.md, fontSize: 28, fontWeight: '900',
    letterSpacing: 10, textAlign: 'center',
    backgroundColor: colors.rose, color: colors.text,
  },
  codeHint: { fontSize: 11, color: colors.text3, textAlign: 'center' },
  errorText: { fontSize: 13, color: colors.red, textAlign: 'center' },
  reminderList: {
    width: '100%', backgroundColor: colors.card, borderRadius: radius.md,
    padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reminderText: { fontSize: 13, color: colors.text2 },
  consentRow: {
    width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.text3,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  consentText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.text2 },
  consentLink: { color: colors.ia, fontWeight: '700', textDecorationLine: 'underline' },
});
