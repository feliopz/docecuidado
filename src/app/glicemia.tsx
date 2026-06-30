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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, radius, fontSize, spacing } from '../constants/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { IAInsight } from '../components/IAInsight';
import Icon from '../components/Icon';
import { addGlucoseReadingDB } from '../lib/supabase-db';
import { genId } from '../lib/id';
import { getChild, getRecorderName } from '../lib/store';
import { MealMoment, MOMENT_LABELS, getGlucoseStatus } from '../types';
import { getGlucoseInsight, readGlucometer } from '../lib/llm';

type Step = 'camera' | 'ocr_confirm' | 'manual' | 'done';

export default function Glicemia() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('camera');
  const [value, setValue] = useState('');
  const [ocrValue, setOcrValue] = useState(0);
  const [moment, setMoment] = useState<MealMoment | null>(null);
  const [insight, setInsight] = useState('');
  const [aiNotice, setAiNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setOcrLoading(true);
    setAiNotice('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (photo?.base64) {
        const result = await readGlucometer(photo.base64);
        if (result.status === 'ok' && result.value != null) {
          setOcrValue(result.value);
          setValue(String(result.value));
          setStep('ocr_confirm');
        } else {
          if (result.status === 'offline') {
            setAiNotice('Você está sem internet. Conecte-se ao Wi-Fi ou dados móveis para ler o glicosímetro com a IA — ou digite o valor manualmente.');
          } else if (result.status === 'failed') {
            setAiNotice('Não consegui analisar a foto com a IA agora. Tente de novo em instantes ou digite o valor manualmente.');
          }
          setStep('manual');
        }
      } else {
        setStep('manual');
      }
    } catch {
      setStep('manual');
    }
    setOcrLoading(false);
  };

  const save = async () => {
    const numValue = parseInt(value, 10);
    if (!numValue || !moment) return;

    setLoading(true);
    const [child, recorder] = await Promise.all([getChild(), getRecorderName()]);
    await addGlucoseReadingDB({
      id: genId(),
      child_id: child?.id ?? 'local',
      reading_value: numValue,
      reading_time: new Date().toISOString(),
      moment,
      recorded_by: recorder,
      created_at: new Date().toISOString(),
    });

    const aiInsight = await getGlucoseInsight(
      numValue,
      child?.name ?? 'a criança',
      child?.glucose_target_min ?? 70,
      child?.glucose_target_max ?? 180,
      MOMENT_LABELS[moment]?.label ?? moment,
    );
    setInsight(aiInsight);
    setLoading(false);
    setStep('done');
  };

  const numValue = parseInt(value, 10);

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
        <Text style={styles.title}>Registrar Glicemia</Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'camera' && (
        <Card style={{ overflow: 'hidden', padding: 0 }}>
          {!permission?.granted ? (
            <View style={styles.permBox}>
              <Icon name="camera" size={48} color={colors.text3} />
              <Text style={styles.permText}>
                Permita acessó a camera para fotografar o glicosímetro
              </Text>
              <Button
                title="Permitir câmera"
                onPress={requestPermission}
                style={{ marginTop: 12 }}
              />
              <Button
                title="Digitar valor"
                variant="outline"
                onPress={() => setStep('manual')}
                style={{ marginTop: 8 }}
              />
            </View>
          ) : (
            <View>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
              >
                {ocrLoading && (
                  <View style={styles.ocrOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.ocrOverlayText}>Lendo glicosímetro...</Text>
                  </View>
                )}
              </CameraView>
              <View style={styles.cameraControls}>
                <Button
                  title="Digitar valor"
                  variant="outline"
                  onPress={() => setStep('manual')}
                  style={{ flex: 1 }}
                />
                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={takePhoto}
                  disabled={ocrLoading}
                >
                  <Icon name="camera" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>
      )}

      {step === 'ocr_confirm' && (
        <Card style={{ alignItems: 'center' }}>
          <Icon name="search" size={48} color={colors.text2} />
          <Text style={styles.instruction}>Li na foto:</Text>
          <Text style={styles.ocrValue}>{ocrValue}</Text>
          <Text style={styles.ocrQuestion}>mg/dL — e isso mesmo?</Text>
          <View style={styles.row}>
            <Button
              title="Sim"
              variant="mint"
              onPress={() => setStep('manual')}
              style={{ flex: 1 }}
            />
            <Button
              title="Corrigir"
              variant="outline"
              onPress={() => { setValue(''); setStep('manual'); }}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}

      {step === 'manual' && (
        <Card>
          {!!aiNotice && (
            <View style={styles.aiNotice}>
              <Icon name="alert" size={18} color={colors.yellow} />
              <Text style={styles.aiNoticeText}>{aiNotice}</Text>
            </View>
          )}
          <Text style={styles.label}>Valor da glicemia (mg/dL)</Text>
          <TextInput
            style={styles.numInput}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder="000"
            placeholderTextColor={colors.text3}
            maxLength={3}
            autoFocus
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Momento da medição</Text>
          <View style={styles.chips}>
            {(Object.entries(MOMENT_LABELS) as [MealMoment, { icon: string; label: string }][]).map(
              ([key, { icon, label }]) => (
                <Chip
                  key={key}
                  icon={icon}
                  label={label}
                  selected={moment === key}
                  onPress={() => setMoment(key)}
                />
              ),
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.red} style={{ marginTop: 16 }} />
          ) : (
            <Button
              title="Registrar"
              onPress={save}
              disabled={!numValue || !moment}
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      )}

      {step === 'done' && (
        <View style={styles.doneScreen}>
          <Icon
            name={getGlucoseStatus(numValue || parseInt(value, 10), 70, 180) === 'green' ? 'happy' : getGlucoseStatus(numValue || parseInt(value, 10), 70, 180) === 'red' ? 'sad' : 'alert'}
            size={64}
            color={colors.green}
          />
          <Text style={styles.doneTitle}>Registrado com carinho!</Text>
          <Text style={styles.doneValue}>{value} mg/dL</Text>
          <Text style={styles.doneMoment}>
            {moment ? MOMENT_LABELS[moment].label : ''}
          </Text>

          <IAInsight label="Gotinha diz" text={insight} />

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
  aiNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF9E7',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  aiNoticeText: { flex: 1, fontSize: 13, color: colors.text2, lineHeight: 19 },
  permBox: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  permText: {
    fontSize: 14,
    color: colors.text2,
    textAlign: 'center',
    lineHeight: 21,
  },
  camera: {
    width: '100%',
    height: 240,
  },
  ocrOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  ocrOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
  },
  captureBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: { fontSize: 15, color: colors.text2, marginBottom: 8, textAlign: 'center' },
  ocrValue: { fontSize: 56, fontWeight: '800', color: colors.green, marginVertical: 8 },
  ocrQuestion: { fontSize: 15, color: colors.text2, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10, width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 8 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  doneScreen: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  doneTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  doneValue: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.red },
  doneMoment: { fontSize: 15, color: colors.text2 },
});
