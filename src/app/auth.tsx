import { useState } from 'react';
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
import { colors, radius, fontSize, spacing } from '../constants/theme';
import { Button } from '../components/Button';
import Icon from '../components/Icon';
import { signUpWithEmail, signInWithEmail, migrateLocalData, resendConfirmation } from '../lib/auth';
import { supabase } from '../lib/supabase';

type AuthMode = 'signup' | 'signin';

export default function Auth() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const canSubmit = email.trim().length > 3 && password.length >= 8;

  const submit = async () => {
    setLoading(true);
    setError('');

    if (mode === 'signin') {
      const { error: err } = await signInWithEmail(email.trim(), password);
      if (err) { setError(err.message); setLoading(false); return; }
      const { data } = await supabase.auth.getSession();
      if (data.session) await migrateLocalData(data.session.user.id);
      router.replace('/(tabs)');
      setLoading(false);
      return;
    }

    const { error: err, needsConfirmation } = await signUpWithEmail(email.trim(), password);
    if (err) { setError(err.message); setLoading(false); return; }

    if (needsConfirmation) {
      setPendingConfirmation(true);
      setLoading(false);
      return;
    }

    // Confirmation disabled — session created immediately.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) await migrateLocalData(sessionData.session.user.id);
    router.replace('/(tabs)');
    setLoading(false);
  };

  const tryLoginAfterConfirm = async () => {
    setLoading(true);
    setError('');
    const { error: err } = await signInWithEmail(email.trim(), password);
    if (err) { setError(err.message); setLoading(false); return; }
    const { data } = await supabase.auth.getSession();
    if (data.session) await migrateLocalData(data.session.user.id);
    router.replace('/(tabs)');
    setLoading(false);
  };

  const handleResend = async () => {
    setResendMsg('');
    const { error: err } = await resendConfirmation(email.trim());
    setResendMsg(err ? err.message : 'E-mail de confirmação reenviado.');
  };

  // ── Email confirmation pending screen ───────────────────────────────────────
  if (pendingConfirmation) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.pendingView}>
          <Icon name="heart-active" size={64} color={colors.red} />
          <Text style={styles.pendingTitle}>Confirme seu e-mail</Text>
          <Text style={styles.pendingText}>
            Enviamos um link de confirmação para{'\n'}
            <Text style={{ fontWeight: '700', color: colors.text }}>{email.trim()}</Text>
          </Text>
          <Text style={styles.pendingHint}>
            Abra o e-mail e toque em confirmar. Só depois disso você conseguirá entrar com esse e-mail.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {resendMsg ? <Text style={styles.resendMsg}>{resendMsg}</Text> : null}

          {loading ? (
            <ActivityIndicator size="large" color={colors.red} style={{ marginTop: 12 }} />
          ) : (
            <>
              <Button title="Já confirmei — entrar" onPress={tryLoginAfterConfirm} style={{ marginTop: 12, alignSelf: 'stretch' }} />
              <TouchableOpacity onPress={handleResend} style={styles.linkBtn}>
                <Text style={styles.linkText}>Reenviar e-mail de confirmação</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setPendingConfirmation(false); setError(''); setResendMsg(''); setMode('signup'); }}
                style={styles.linkBtn}
              >
                <Text style={styles.linkTextMuted}>Usar outro e-mail</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.linkBtn}>
                <Text style={styles.linkTextMuted}>Continuar usando o app por enquanto</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { marginTop: insets.top + 8 }]}>
        <Icon name="back" size={24} color={colors.text2} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Icon name="heart-active" size={48} color={colors.red} />
        <Text style={styles.title}>Sua conta no Doce Cuidado</Text>
        <Text style={styles.subtitle}>
          Salve seus registros, sincronize entre dispositivos e compartilhe com médicos.
        </Text>
      </View>

      <View style={styles.tabsRow}>
        {(['signup', 'signin'] as AuthMode[]).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.tab, mode === m && styles.tabActive]}
            onPress={() => { setMode(m); setError(''); }}
          >
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'signup' ? 'Criar conta' : 'Entrar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.text3}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha (mínimo 8 caracteres)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.text3}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.red} style={{ marginTop: 16 }} />
        ) : (
          <Button
            title={mode === 'signin' ? 'Entrar' : 'Criar conta'}
            onPress={submit}
            disabled={!canSubmit}
            style={{ marginTop: 8 }}
          />
        )}

        <TouchableOpacity onPress={() => router.back()} style={styles.skipBtn}>
          <Text style={styles.skipText}>Agora não</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  backBtn: { padding: 8, alignSelf: 'flex-start' },
  header: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.text2, textAlign: 'center', lineHeight: 22 },
  tabsRow: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: radius.md, padding: 4, gap: 4, marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.red },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.text2 },
  tabTextActive: { color: '#FFFFFF' },
  form: { gap: 12 },
  input: {
    padding: 14, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.md, fontSize: fontSize.md,
    backgroundColor: '#F8F9FA', color: colors.text,
  },
  error: { fontSize: 13, color: colors.red, textAlign: 'center' },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipText: { fontSize: 14, color: colors.text3 },
  pendingView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: 10 },
  pendingTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: 8 },
  pendingText: { fontSize: fontSize.md, color: colors.text2, textAlign: 'center', lineHeight: 24 },
  pendingHint: { fontSize: 13, color: colors.text3, textAlign: 'center', lineHeight: 19, marginTop: 4, paddingHorizontal: 8 },
  resendMsg: { fontSize: 13, color: colors.green, textAlign: 'center' },
  linkBtn: { paddingVertical: 10 },
  linkText: { fontSize: 14, color: colors.red, fontWeight: '700', textAlign: 'center' },
  linkTextMuted: { fontSize: 13, color: colors.text3, textAlign: 'center' },
});
