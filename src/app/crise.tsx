import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../constants/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import Icon from '../components/Icon';
import { getCrisisGuidance } from '../lib/llm';

type CrisisStep = 0 | 1 | 2 | 3 | 4;

interface Symptoms {
  color?: string;
  sweating?: string;
  breathing?: string;
}

export default function Crise() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<CrisisStep>(0);
  const [symptoms, setSymptoms] = useState<Symptoms>({});
  const [aiGuidance, setAiGuidance] = useState('');

  const answer = (field: keyof Symptoms, value: string) => {
    const updated = { ...symptoms, [field]: value };
    setSymptoms(updated);
    const nextStep = (step + 1) as CrisisStep;
    setStep(nextStep);

    if (nextStep === 4) {
      getCrisisGuidance(
        {
          color: updated.color ?? '',
          sweating: updated.sweating ?? '',
          breathing: updated.breathing ?? '',
        },
        'a criança',
      ).then(text => setAiGuidance(text));
    }
  };

  const callEmergency = () => {
    Linking.openURL('tel:192');
  };

  const analysis = analyzeSymptoms(symptoms);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {step === 0 && (
        <View style={styles.stepView}>
          <Icon name="heart-active" size={64} color={colors.red} />
          <Text style={styles.stepTitle}>Calma, vamos juntos.</Text>
          <Text style={styles.stepSubtitle}>
            Vou fazer algumas perguntas para entender o que está acontecendo.
          </Text>
          <Button title="Começar" onPress={() => setStep(1)} large />
        </View>
      )}

      {step === 1 && (
        <View style={styles.stepView}>
          <Text style={styles.question}>Como está a cor da criança?</Text>
          <View style={styles.options}>
            <Button title="Normal, corada" variant="outline" onPress={() => answer('color', 'normal')} large />
            <Button title="Pálida, meio cinza" variant="outline" onPress={() => answer('color', 'pálida')} large />
            <Button title="Não sei dizer" variant="outline" onPress={() => answer('color', 'nao_sei')} large />
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepView}>
          <Text style={styles.question}>Ela está suando?</Text>
          <View style={styles.options}>
            <Button title="Não, pele seca" variant="outline" onPress={() => answer('sweating', 'não')} large />
            <Button title="Sim, suor frio" variant="outline" onPress={() => answer('sweating', 'suor_frio')} large />
            <Button title="Sim, muito suor" variant="outline" onPress={() => answer('sweating', 'muito_suor')} large />
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepView}>
          <Text style={styles.question}>Como está a respiração dela?</Text>
          <View style={styles.options}>
            <Button title="Normal, tranquila" variant="outline" onPress={() => answer('breathing', 'normal')} large />
            <Button title="Rápida e profunda" variant="outline" onPress={() => answer('breathing', 'rápida')} large />
            <Button title="Ofegante, difícil" variant="outline" onPress={() => answer('breathing', 'ofegante')} large />
          </View>
        </View>
      )}

      {step === 4 && (
        <View style={styles.stepView}>
          <Icon name="clipboard" size={48} color={colors.text2} />
          <Text style={styles.stepTitle}>Análise concluída</Text>

          <Card style={{ backgroundColor: analysis.severe ? colors.rose : colors.mint }}>
            <View style={styles.orientRow}>
              <Icon
                name={analysis.severe ? 'warning-active' : 'checkmark'}
                size={20}
                color={analysis.severe ? colors.red : colors.green}
              />
              <Text style={styles.orientTitle}>Orientação:</Text>
            </View>
            <Text style={styles.guidance}>{analysis.text}</Text>
            {analysis.warning ? (
              <Text style={styles.warningText}>{analysis.warning}</Text>
            ) : null}
            {aiGuidance ? (
              <View style={styles.aiRow}>
                <Icon name="sparkles" size={13} color={colors.ia} />
                <Text style={styles.aiText}>{aiGuidance}</Text>
              </View>
            ) : null}
          </Card>

          <View style={styles.actions}>
            <Button
              title="Ligar 192 (SAMU)"
              variant="outline"
              onPress={callEmergency}
              style={{ borderColor: colors.red }}
            />
            <Button
              title="Voltar ao início"
              variant="outline"
              onPress={() => router.replace('/(tabs)')}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function analyzeSymptoms(symptoms: Symptoms) {
  if (symptoms.breathing === 'rápida' || symptoms.breathing === 'ofegante') {
    return {
      severe: true,
      text: 'Os sintomas sugerem uma possível cetoacidose diabética.\n\nLIGUE 192 AGORA\n\nInforme que é criança com diabetes. Mantenha a criança calma e não ofereça insulina por conta própria.',
      warning: null,
    };
  }

  if (symptoms.color === 'pálida' && (symptoms.sweating === 'suor_frio' || symptoms.sweating === 'muito_suor')) {
    return {
      severe: true,
      text: 'Os sintomas descritos sugerem uma possível hipoglicemia.\n\nSe a criança estiver consciente e conseguindo engolir, ofereça 15g de carboidrato rápido (meio copo de suco de laranja, 1 colher de sopa de açúcar dissolvido em água ou 1 colher de mel).\n\nEspere 15 minutos e meça a glicose de novo. Se continuar baixa, repita.',
      warning: 'Se ela estiver sonolenta, confusa, desacordada ou não conseguir engolir: NÃO dê nada pela boca — há risco de engasgo. Ligue 192 imediatamente.',
    };
  }

  return {
    severe: false,
    text: 'Os sintomas não indicam uma emergência imediata, mas:\n\n• Meça a glicose agora se possível\n• Ofereça água\n• Monitore nos próximos 30 min\n• Qualquer piora: ligue 192\n\nSe tiver dúvida: sempre ligue 192 (segurança primeiro)',
    warning: null,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, flexGrow: 1, justifyContent: 'center' },
  stepView: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 15,
    color: colors.text2,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  question: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  options: { gap: 10, width: '100%' },
  orientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  orientTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  guidance: { fontSize: 15, lineHeight: 24, color: colors.text },
  warningText: { fontSize: 13, color: colors.text2, marginTop: 12, lineHeight: 20 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  aiText: { fontSize: 13, color: colors.ia, lineHeight: 20, flex: 1, fontStyle: 'italic' },
  actions: { gap: 10, width: '100%', marginTop: 8 },
});
