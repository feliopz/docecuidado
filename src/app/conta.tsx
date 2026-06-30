import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../constants/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import Icon from '../components/Icon';
import { supabase } from '../lib/supabase';
import { isAuthenticated, signOut } from '../lib/auth';
import {
  getAccountType,
  getAccountName,
  setAccountName,
  clearAll,
} from '../lib/store';
import { logError } from '../lib/log';
import { AccountType, ACCOUNT_TYPE_LABELS } from '../types';

export default function Conta() {
  const insets = useSafeAreaInsets();
  const [accountType, setAccountType] = useState<AccountType>('responsavel');
  const [name, setName] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, n, auth] = await Promise.all([getAccountType(), getAccountName(), isAuthenticated()]);
      setAccountType(t);
      setName(n);
      setLoggedIn(auth);
    })();
  }, []);

  const saveName = async () => {
    await setAccountName(name.trim());
    Alert.alert('Pronto', 'Seu nome foi atualizado.');
  };

  const changePassword = async () => {
    if (newPassword.length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      setNewPassword('');
      Alert.alert('Pronto', 'Senha alterada com sucesso.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const handleDelete = () => {
    const isResp = accountType === 'responsavel';
    Alert.alert(
      'Excluir conta e dados',
      isResp
        ? 'Isso vai apagar PERMANENTEMENTE a(s) criança(s) e todos os registros (glicemias, insulinas, refeições). Esta ação não pode ser desfeita.'
        : 'Isso vai remover seu vínculo com a(s) criança(s) e apagar seus dados locais. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir tudo',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Tem certeza?',
              'Confirme novamente para excluir definitivamente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sim, excluir',
                  style: 'destructive',
                  onPress: async () => {
                    setBusy(true);
                    // Full server-side erasure (data + auth user) when signed in.
                    // Pre-auth users have no cloud data — clearing local suffices.
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (session) {
                        const { error } = await supabase.functions.invoke('delete-account');
                        if (error) logError('conta.deleteAccount', error);
                      }
                    } catch (e) {
                      logError('conta.deleteAccount', e);
                    }
                    try { await supabase.auth.signOut(); } catch (e) { logError('conta.signOut', e); }
                    await clearAll();
                    setBusy(false);
                    router.replace('/');
                  },
                },
              ],
            );
          },
        },
      ],
    );
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
        <Text style={styles.title}>Conta e privacidade</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Identity */}
      <Card>
        <View style={styles.sectionRow}>
          <Icon name="profile" size={16} color={colors.text2} />
          <Text style={styles.sectionTitle}>Seus dados</Text>
        </View>
        <View style={styles.badge}>
          <Icon name={accountType === 'medico' ? 'medkit' : accountType === 'cuidador' ? 'people' : 'heart'} size={14} color={colors.red} />
          <Text style={styles.badgeText}>{ACCOUNT_TYPE_LABELS[accountType]}</Text>
        </View>
        <Text style={styles.label}>Seu nome</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          placeholderTextColor={colors.text3}
          autoCapitalize="words"
        />
        <Button title="Salvar nome" variant="outline" onPress={saveName} disabled={!name.trim()} style={{ marginTop: 10 }} />
      </Card>

      {/* Password */}
      <Card>
        <View style={styles.sectionRow}>
          <Icon name="lock" size={16} color={colors.text2} />
          <Text style={styles.sectionTitle}>Senha</Text>
        </View>
        {loggedIn ? (
          <>
            <Text style={styles.label}>Nova senha (mínimo 6 caracteres)</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nova senha"
              placeholderTextColor={colors.text3}
              secureTextEntry
            />
            <Button title="Alterar senha" onPress={changePassword} disabled={newPassword.length < 6 || busy} style={{ marginTop: 10 }} />
          </>
        ) : (
          <Text style={styles.muted}>
            Você ainda não tem conta na nuvem. Crie uma conta para poder gerenciar senha e sincronizar seus dados.
          </Text>
        )}
      </Card>

      {/* Session / danger zone */}
      <Card>
        <View style={styles.sectionRow}>
          <Icon name="shield" size={16} color={colors.text2} />
          <Text style={styles.sectionTitle}>Privacidade (LGPD)</Text>
        </View>
        {loggedIn && (
          <TouchableOpacity style={styles.linkRow} onPress={handleSignOut}>
            <Icon name="logout" size={18} color={colors.text2} />
            <Text style={styles.linkText}>Sair da conta</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.muted}>
          Você pode excluir sua conta e todos os dados a qualquer momento. {accountType === 'responsavel'
            ? 'Como responsável, isso apaga os registros da(s) criança(s).'
            : 'Como cuidador(a)/médico(a), isso remove seu vínculo e seus dados locais.'}
        </Text>
        {busy ? (
          <ActivityIndicator color={colors.red} style={{ marginTop: 12 }} />
        ) : (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Icon name="trash" size={18} color="#fff" />
            <Text style={styles.deleteText}>Excluir conta e todos os dados</Text>
          </TouchableOpacity>
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
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: colors.rose, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.full, marginBottom: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.red },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 8 },
  input: {
    padding: 14, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.md, fontSize: fontSize.md, backgroundColor: '#F8F9FA', color: colors.text,
  },
  muted: { fontSize: 13, color: colors.text3, lineHeight: 19 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  linkText: { fontSize: 15, fontWeight: '600', color: colors.text2 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.red, borderRadius: radius.md, paddingVertical: 14, marginTop: 12,
  },
  deleteText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
