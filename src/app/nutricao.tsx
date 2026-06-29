import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, radius, fontSize, spacing } from '../constants/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { IAInsight } from '../components/IAInsight';
import Icon from '../components/Icon';
import { addMealDB } from '../lib/supabase-db';
import { getChild, getRecorderName } from '../lib/store';
import { getMealInsight, analyzeMealPhoto } from '../lib/llm';

type Step = 'choose' | 'camera' | 'analyzing' | 'result' | 'input' | 'done';

export default function Nutricao() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('choose');
  const [description, setDescription] = useState('');
  const [carbsStr, setCarbsStr] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (step !== 'analyzing' || !pendingBase64) return;
    let cancelled = false;
    (async () => {
      try {
        const analysis = await analyzeMealPhoto(pendingBase64);
        if (cancelled) return;
        if (analysis) {
          setDescription(analysis.description);
          if (analysis.estimated_carbs_g != null) setCarbsStr(String(analysis.estimated_carbs_g));
          const insight = await getMealInsight(analysis.description, 0, analysis.estimated_carbs_g ?? 0, 0, 0);
          if (!cancelled) setAiNotes(insight);
        }
      } catch {}
      if (!cancelled) setStep('result');
    })();
    return () => { cancelled = true; };
  }, [step]);

  const reset = () => {
    setDescription('');
    setCarbsStr('');
    setAiNotes('');
    setPhotoUri(null);
    setPendingBase64(null);
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setStep('camera');
  };

  const takePicture = async () => {
    if (!cameraRef) return;
    try {
      const photo = await cameraRef.takePictureAsync({ base64: true, quality: 0.6 });
      if (!photo?.base64) return;
      setPhotoUri(photo.uri ?? null);
      setPendingBase64(photo.base64);
      setStep('analyzing');
    } catch {
      setStep('choose');
    }
  };

  const save = async () => {
    const [child, recorder] = await Promise.all([getChild(), getRecorderName()]);
    const carbs = parseInt(carbsStr, 10) || undefined;
    await addMealDB({
      id: Date.now().toString(),
      child_id: child?.id ?? 'local',
      meal_time: new Date().toISOString(),
      description: description.trim() || 'Refeição registrada',
      carbs_grams: carbs,
      recorded_by: recorder,
      created_at: new Date().toISOString(),
    });
    setStep('done');
  };

  const cancel = () => {
    reset();
    setStep('choose');
  };

  // ── Camera view ──────────────────────────────────────────────────────────────
  if (step === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          ref={r => setCameraRef(r)}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
        <View style={[cameraStyles.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity onPress={() => setStep('choose')} style={cameraStyles.backBtn}>
            <Icon name="back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={cameraStyles.frame}>
            <View style={[cameraStyles.corner, cameraStyles.topLeft]} />
            <View style={[cameraStyles.corner, cameraStyles.topRight]} />
            <View style={[cameraStyles.corner, cameraStyles.bottomLeft]} />
            <View style={[cameraStyles.corner, cameraStyles.bottomRight]} />
          </View>
          <Text style={cameraStyles.hint}>Aponte para o prato da refeição</Text>
          <TouchableOpacity style={cameraStyles.shutterBtn} onPress={takePicture}>
            <View style={cameraStyles.shutterInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Analyzing view (full-screen loading) ─────────────────────────────────────
  if (step === 'analyzing') {
    return (
      <View style={[styles.analyzingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.ia} />
        <Text style={styles.analyzingTitle}>A Gotinha está analisando...</Text>
        <Text style={styles.analyzingHint}>Identificando alimentos e estimando carboidratos</Text>
      </View>
    );
  }

  // ── Main scroll view ─────────────────────────────────────────────────────────
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
        <Text style={styles.title}>Registrar Refeição</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Escolha como registrar */}
      {step === 'choose' && (
        <View style={styles.chooseRow}>
          <TouchableOpacity style={styles.chooseCard} onPress={openCamera}>
            <Icon name="camera" size={40} color={colors.red} />
            <Text style={styles.chooseTitle}>Fotografar o prato</Text>
            <Text style={styles.chooseHint}>
              Tire uma foto e a IA identifica os alimentos e estima os carboidratos automaticamente
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chooseCard} onPress={() => setStep('input')}>
            <Icon name="edit" size={40} color={colors.text2} />
            <Text style={styles.chooseTitle}>Descrever manualmente</Text>
            <Text style={styles.chooseHint}>
              Digite o que a criança comeu e informe os carboidratos se souber
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual input form */}
      {step === 'input' && (
        <Card>
          <Text style={styles.label}>O que a criança comeu?</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: arroz, feijão, frango grelhado e salada"
            placeholderTextColor={colors.text3}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoFocus
          />
          <Text style={[styles.label, { marginTop: 14 }]}>
            Carboidratos estimados (g) — opcional
          </Text>
          <TextInput
            style={styles.numInput}
            value={carbsStr}
            onChangeText={setCarbsStr}
            keyboardType="numeric"
            placeholder="Ex: 45"
            placeholderTextColor={colors.text3}
            maxLength={4}
          />
          <Button
            title="Registrar refeição"
            onPress={save}
            disabled={!description.trim()}
            style={{ marginTop: 14 }}
          />
          <TouchableOpacity onPress={cancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Result after AI analysis */}
      {step === 'result' && (
        <Card>
          {photoUri && (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              <View style={styles.photoOverlay}>
                <Icon name="meal-active" size={16} color="#fff" />
                <Text style={styles.photoLabel}>Foto analisada</Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>O que a criança comeu?</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Descrição da refeição"
            placeholderTextColor={colors.text3}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>
            Carboidratos estimados (g) — opcional
          </Text>
          <TextInput
            style={styles.numInput}
            value={carbsStr}
            onChangeText={setCarbsStr}
            keyboardType="numeric"
            placeholder="Ex: 45"
            placeholderTextColor={colors.text3}
            maxLength={4}
          />

          {aiNotes ? (
            <IAInsight label="Gotinha analisou" text={aiNotes} />
          ) : null}

          <Button title="Registrar refeição" onPress={save} style={{ marginTop: 14 }} />
          <TouchableOpacity onPress={cancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Concluído */}
      {step === 'done' && (
        <View style={styles.doneScreen}>
          <Icon name="meal-active" size={64} color={colors.green} />
          <Text style={styles.doneTitle}>Refeição registrada!</Text>
          <Text style={styles.doneHint}>
            Não esqueça de medir a glicose daqui 2h para ver como o corpo reagiu.
          </Text>
          <Button
            title="Registrar outra"
            variant="outline"
            onPress={() => { reset(); setStep('choose'); }}
            style={{ marginTop: 8 }}
          />
          <Button
            title="Voltar ao início"
            onPress={() => router.replace('/(tabs)')}
            style={{ marginTop: 8 }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const cameraStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  backBtn: {
    alignSelf: 'flex-start', padding: 8,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20,
  },
  frame: { width: 260, height: 200, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#fff', borderWidth: 3 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: { color: '#fff', fontSize: 14, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 6 },
  shutterBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  analyzingScreen: {
    flex: 1, backgroundColor: colors.bg,
    justifyContent: 'center', alignItems: 'center', gap: 16, padding: spacing.lg,
  },
  analyzingTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, textAlign: 'center' },
  analyzingHint: { fontSize: fontSize.sm, color: colors.text2, textAlign: 'center' },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 12, borderRadius: radius.lg,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  chooseRow: { flexDirection: 'row', gap: 12 },
  chooseCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 20, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  chooseTitle: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
  chooseHint: { fontSize: 12, color: colors.text3, textAlign: 'center', lineHeight: 17 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 8 },
  textArea: {
    padding: 14, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.md, fontSize: fontSize.sm,
    backgroundColor: '#F8F9FA', color: colors.text,
    minHeight: 80, lineHeight: 22,
  },
  numInput: {
    fontSize: 20, fontWeight: '700', textAlign: 'center',
    padding: 12, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: '#F8F9FA', color: colors.text,
  },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 14, color: colors.text3, fontWeight: '600' },
  photoWrap: { borderRadius: radius.md, overflow: 'hidden', marginBottom: 14, position: 'relative' },
  photoPreview: { width: '100%', height: 160, borderRadius: radius.md },
  photoOverlay: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  photoLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  doneScreen: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  doneTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  doneHint: {
    fontSize: 14, color: colors.text2, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16,
  },
});
