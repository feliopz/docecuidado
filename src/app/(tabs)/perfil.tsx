import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Linking,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../../constants/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import Icon, { IconName } from '../../components/Icon';
import {
  getChild, getOrCreateInviteCode, forceNewInviteCode,
  getLinkedChildren, getActiveChildId, setActiveChildId,
  addLinkedChild, saveChildById,
  getAccountType, getAccountName, getAccountId,
  removeLinkedChild, setOnboarded, LinkedChild,
} from '../../lib/store';
import { isAuthenticated } from '../../lib/auth';
import {
  fetchCaregiversDB,
  deleteCaregiverDB,
  fetchEmergencyContactsDB,
  addEmergencyContactDB,
  deleteEmergencyContactDB,
  redeemInviteCode,
  fetchChildById,
  associateAsCaregiver,
  disassociateCaregiver,
  ensureResponsibleCaregiver,
} from '../../lib/supabase-db';
import { Child, Caregiver, EmergencyContact, INSULIN_LABELS, InsulinType, AccountType, DIAGNOSIS_LABELS } from '../../types';
import {
  areNotificationsEnabled,
  setNotificationsEnabled,
  requestNotificationPermission,
  scheduleTestNotification,
  getNotificationDebugInfo,
  GLUCOSE_REMINDER_SLOTS,
  NotificationDebugInfo,
} from '../../lib/notifications';

export default function Perfil() {
  const insets = useSafeAreaInsets();
  const [child, setChild] = useState<Child | null>(null);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactType, setContactType] = useState<'medico' | 'samu' | 'outro'>('outro');
  const [accountType, setAccountType] = useState<AccountType>('responsavel');
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);
  const [showAssociate, setShowAssociate] = useState(false);
  const [assocCode, setAssocCode] = useState('');
  const [assocLoading, setAssocLoading] = useState(false);
  const [assocError, setAssocError] = useState('');
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifDebug, setNotifDebug] = useState<NotificationDebugInfo | null>(null);
  const [notifTesting, setNotifTesting] = useState(false);

  const isResponsavel = accountType === 'responsavel';
  const isMedico = accountType === 'medico';

  const reloadChildData = async (c: Child | null) => {
    if (!c?.id) return;
    const [cgs, cts, code] = await Promise.all([
      fetchCaregiversDB(c.id),
      fetchEmergencyContactsDB(c.id),
      isResponsavel ? getOrCreateInviteCode(c.id) : Promise.resolve(''),
    ]);
    setCaregivers(cgs);
    setContacts(cts);
    setInviteCode(code);
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [c, linked, activeId, at, loggedIn, notifOn] = await Promise.all([
          getChild(), getLinkedChildren(), getActiveChildId(), getAccountType(), isAuthenticated(),
          areNotificationsEnabled(),
        ]);
        setChild(c);
        setLinkedChildren(linked);
        setActiveChildIdState(activeId);
        setAccountType(at);
        setIsLoggedIn(loggedIn);
        setNotifEnabled(notifOn);
        if (!isMedico) {
          getNotificationDebugInfo().then(setNotifDebug).catch(() => setNotifDebug(null));
        }
        if (c?.id) {
          // Backfill the responsible's caregiver row so caregivers/doctors can see them.
          if (at === 'responsavel') {
            const [accId, accName] = await Promise.all([getAccountId(), getAccountName()]);
            await ensureResponsibleCaregiver(c.id, accId, accName || 'Responsável');
          }
          const [cgs, cts, code] = await Promise.all([
            fetchCaregiversDB(c.id),
            fetchEmergencyContactsDB(c.id),
            at === 'responsavel' ? getOrCreateInviteCode(c.id) : Promise.resolve(''),
          ]);
          setCaregivers(cgs);
          setContacts(cts);
          setInviteCode(code);
        }
      })();
    }, []),
  );

  const handleDeleteCaregiver = (cg: Caregiver) => {
    Alert.alert('Remover cuidador', `Remover ${cg.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          await deleteCaregiverDB(cg.id);
          setCaregivers(prev => prev.filter(c => c.id !== cg.id));
        },
      },
    ]);
  };

  const handleShareInvite = async () => {
    if (!child || !inviteCode) return;
    try {
      await Share.share({
        title: 'Convite Doce Cuidado',
        message:
          `Olá! Estou usando o Doce Cuidado para acompanhar ${child.name}.\n\n` +
          `Baixe o app, escolha "Sou cuidador(a)" ou "Sou médico(a)" e insira o código:\n\n` +
          `${inviteCode}\n\n` +
          `O código é de uso único e vincula sua conta à família.`,
      });
    } catch { /* cancelled */ }
  };

  const handleAddContact = async () => {
    if (!contactName.trim() || !contactPhone.trim() || !child) return;
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      child_id: child.id,
      name: contactName.trim(),
      phone: contactPhone.trim(),
      type: contactType,
    };
    await addEmergencyContactDB(newContact);
    setContacts(prev => [...prev, newContact]);
    setContactName('');
    setContactPhone('');
    setContactType('outro');
    setShowAddContact(false);
  };

  const handleDeleteContact = (ct: EmergencyContact) => {
    Alert.alert('Remover contato', `Remover ${ct.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          await deleteEmergencyContactDB(ct.id);
          setContacts(prev => prev.filter(c => c.id !== ct.id));
        },
      },
    ]);
  };

  const contactTypeIcon = (type: EmergencyContact['type']): IconName => {
    if (type === 'medico') return 'medkit';
    if (type === 'samu') return 'ambulance';
    return 'call';
  };

  const handleSwitchChild = async (lc: LinkedChild) => {
    await setActiveChildId(lc.id);
    setActiveChildIdState(lc.id);
    const c = await getChild();
    setChild(c);
    await reloadChildData(c);
  };

  const handleAssociate = async () => {
    if (assocCode.trim().length !== 6) return;
    setAssocLoading(true);
    setAssocError('');
    const childId = await redeemInviteCode(assocCode.trim().toUpperCase());
    if (!childId) {
      setAssocError('Código inválido ou já utilizado.');
      setAssocLoading(false);
      return;
    }
    const childData = await fetchChildById(childId);
    if (!childData) {
      setAssocError('Não foi possível carregar os dados. Verifique sua conexão.');
      setAssocLoading(false);
      return;
    }
    const [accId, accName] = await Promise.all([getAccountId(), getAccountName()]);
    await associateAsCaregiver(childId, accId, accName, accountType === 'medico' ? 'medico' : 'caregiver');
    await saveChildById(childData);
    await addLinkedChild({ id: childId, name: childData.name, gender: childData.gender, role: accountType === 'medico' ? 'medico' : 'caregiver' });
    await setActiveChildId(childId);
    const updated = await getLinkedChildren();
    setLinkedChildren(updated);
    setActiveChildIdState(childId);
    setChild(childData);
    await reloadChildData(childData);
    setAssocCode('');
    setShowAssociate(false);
    setAssocLoading(false);
    Alert.alert('Vinculado!', `Você agora acompanha ${childData.name}.`);
  };

  const handleDisassociate = () => {
    if (!child) return;
    Alert.alert(
      'Desassociar',
      `Deixar de acompanhar ${child.name}? Você precisará de um novo código para vincular novamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desassociar', style: 'destructive',
          onPress: async () => {
            const accId = await getAccountId();
            await disassociateCaregiver(child.id, accId);
            await removeLinkedChild(child.id);
            const remaining = await getLinkedChildren();
            setLinkedChildren(remaining);
            if (remaining.length === 0) {
              await setOnboarded(false);
              router.replace('/onboarding');
              return;
            }
            const c = await getChild();
            setChild(c);
            setActiveChildIdState(await getActiveChildId());
            await reloadChildData(c);
          },
        },
      ],
    );
  };

  const roleBadge = (role: string): { label: string; bg: string; color: string } => {
    if (role === 'responsavel' || role === 'admin') return { label: 'Responsável', bg: colors.rose, color: colors.red };
    if (role === 'medico') return { label: 'Médico(a)', bg: colors.sky, color: '#2471A3' };
    return { label: 'Cuidador(a)', bg: colors.mint, color: '#1E8449' };
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topbar}>
        <View style={styles.titleRow}>
          <Icon name="profile" size={20} color={colors.text2} />
          <Text style={styles.title}>{isResponsavel ? 'Minha Família' : 'Perfil'}</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => router.push('/conta')}>
          <Icon name="settings" size={18} color={colors.red} />
        </TouchableOpacity>
      </View>

      {/* Auth banner */}
      {!isLoggedIn ? (
        <TouchableOpacity style={styles.authBanner} onPress={() => router.push('/auth')}>
          <Icon name="heart" size={18} color={colors.red} />
          <View style={{ flex: 1 }}>
            <Text style={styles.authBannerTitle}>Salve seus dados na nuvem</Text>
            <Text style={styles.authBannerSub}>Crie uma conta para não perder seus registros</Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.red} />
        </TouchableOpacity>
      ) : (
        <View style={styles.authBannerOk}>
          <Icon name="checkmark" size={16} color={colors.green} />
          <Text style={styles.authBannerOkText}>Conta ativa — dados sincronizados</Text>
        </View>
      )}

      {/* Child profile */}
      <Card style={{ alignItems: 'center' }}>
        <Icon name={child?.gender === 'boy' ? 'person-add' : 'profile'} size={56} color={colors.text2} />
        <Text style={styles.childName}>{child?.name ?? 'Criança'}</Text>
        <Text style={styles.childMeta}>{DIAGNOSIS_LABELS[child?.diagnosis ?? 'dm1']}</Text>
        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: colors.mint }]}>
            <Text style={[styles.tagText, { color: '#1E8449' }]}>
              Meta: {child?.glucose_target_min ?? 70}–{child?.glucose_target_max ?? 180} mg/dL
            </Text>
          </View>
          {child?.insulin_types.map(type => {
            const lbl = INSULIN_LABELS[type as InsulinType];
            return (
              <View key={type} style={[styles.tag, { backgroundColor: colors.sky }]}>
                <Text style={[styles.tagText, { color: '#2471A3' }]}>{lbl?.label ?? type}</Text>
              </View>
            );
          })}
        </View>
        {isResponsavel ? (
          <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/editar-perfil')}>
            <Icon name="edit" size={14} color={colors.red} />
            <Text style={styles.editBtnText}>Editar perfil</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.readOnlyNote}>
            <Icon name="lock" size={13} color={colors.text3} />
            <Text style={styles.readOnlyText}>Apenas o responsável edita o perfil</Text>
          </View>
        )}
      </Card>

      {/* Linked children switcher */}
      {linkedChildren.length > 0 && (
        <Card>
          <View style={styles.sectionRow}>
            <Icon name="swap" size={16} color={colors.text2} />
            <Text style={styles.sectionTitle}>Crianças</Text>
          </View>
          {linkedChildren.map(lc => {
            const b = roleBadge(lc.role === 'owner' ? 'responsavel' : lc.role);
            return (
              <TouchableOpacity
                key={lc.id}
                style={[styles.rowItem, lc.id === activeChildId && styles.rowItemActive]}
                onPress={() => handleSwitchChild(lc)}
              >
                <Icon name={lc.gender === 'boy' ? 'person-add' : 'profile'} size={22} color={lc.id === activeChildId ? colors.red : colors.text2} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.rowName, lc.id === activeChildId && { color: colors.red }]}>{lc.name}</Text>
                  <Text style={styles.rowMeta}>{b.label}{lc.id === activeChildId ? ' · ativo' : ''}</Text>
                </View>
                {lc.id === activeChildId && <Icon name="checkmark" size={16} color={colors.red} />}
              </TouchableOpacity>
            );
          })}
          {isResponsavel && (
            <Button title="Adicionar outra criança" variant="outline" onPress={() => router.push('/nova-crianca')} style={{ marginTop: 10 }} />
          )}
          {!isResponsavel && (
            <Button title="Associar a outra criança" variant="outline" onPress={() => setShowAssociate(v => !v)} style={{ marginTop: 10 }} />
          )}
          {!isResponsavel && showAssociate && (
            <View style={styles.addForm}>
              <TextInput
                style={[styles.input, styles.codeField]}
                value={assocCode}
                onChangeText={v => { setAssocCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '')); setAssocError(''); }}
                placeholder="CÓDIGO"
                placeholderTextColor={colors.text3}
                autoCapitalize="characters"
                maxLength={6}
              />
              {assocError ? <Text style={styles.errorText}>{assocError}</Text> : null}
              {assocLoading ? <ActivityIndicator color={colors.red} /> : (
                <Button title="Associar" onPress={handleAssociate} disabled={assocCode.length !== 6} />
              )}
            </View>
          )}
        </Card>
      )}

      {/* Care team */}
      <Card>
        <View style={styles.sectionRow}>
          <Icon name="people" size={16} color={colors.text2} />
          <Text style={styles.sectionTitle}>Equipe de cuidado</Text>
        </View>

        {caregivers.length === 0 ? (
          <Text style={styles.emptyText}>Ninguém vinculado ainda.</Text>
        ) : (
          caregivers.map(cg => {
            const b = roleBadge(cg.role);
            return (
              <View key={cg.id} style={styles.rowItem}>
                <Icon name="profile" size={22} color={colors.text2} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rowName}>{cg.name}</Text>
                  <View style={[styles.miniBadge, { backgroundColor: b.bg }]}>
                    <Text style={[styles.miniBadgeText, { color: b.color }]}>{b.label}</Text>
                  </View>
                </View>
                {isResponsavel && cg.role !== 'responsavel' && cg.role !== 'admin' && (
                  <TouchableOpacity onPress={() => handleDeleteCaregiver(cg)}>
                    <Icon name="trash" size={18} color={colors.text3} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {/* Invite code — responsible only */}
        {isResponsavel && (
          <View style={styles.inviteBox}>
            <TouchableOpacity style={styles.inviteHeader} onPress={() => setShowInviteCode(v => !v)} activeOpacity={0.7}>
              <Icon name="share" size={16} color={colors.red} />
              <Text style={styles.inviteTitle}>Convidar cuidador ou médico</Text>
              <Icon name={showInviteCode ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text2} />
            </TouchableOpacity>
            {showInviteCode && inviteCode ? (
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Código de convite</Text>
                <Text style={styles.codeText}>{inviteCode}</Text>
                <Text style={styles.codeHint}>
                  Compartilhe com o cuidador ou médico. Ele baixa o app, escolhe seu papel e insere o código. Uso único.
                </Text>
                <View style={styles.codeActions}>
                  <TouchableOpacity style={styles.codeBtn} onPress={handleShareInvite}>
                    <Icon name="share" size={16} color={colors.red} />
                    <Text style={styles.codeBtnText}>Compartilhar convite</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.codeBtn, { borderColor: colors.text3 }]}
                    onPress={async () => {
                      if (!child) return;
                      const newCode = await forceNewInviteCode(child.id);
                      setInviteCode(newCode);
                    }}
                  >
                    <Icon name="add" size={16} color={colors.text3} />
                    <Text style={[styles.codeBtnText, { color: colors.text3 }]}>Gerar novo código</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Disassociate — caregiver/doctor only */}
        {!isResponsavel && (
          <TouchableOpacity style={styles.disassociateBtn} onPress={handleDisassociate}>
            <Icon name="link-off" size={16} color={colors.red} />
            <Text style={styles.disassociateText}>Desassociar desta criança</Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Emergency contacts — not for doctors */}
      {!isMedico && (
      <Card>
        <View style={styles.sectionRow}>
          <Icon name="call" size={16} color={colors.text2} />
          <Text style={styles.sectionTitle}>Contatos de emergência</Text>
        </View>

        {contacts.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum contato adicionado ainda.</Text>
        ) : (
          contacts.map(ct => (
            <View key={ct.id} style={styles.rowItem}>
              <Icon name={contactTypeIcon(ct.type)} size={22} color={colors.text2} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowName}>{ct.name}</Text>
                <Text style={styles.rowMeta}>{ct.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${ct.phone}`)} style={styles.callBtn}>
                <Icon name="call-active" size={16} color={colors.green} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteContact(ct)} style={{ marginLeft: 8 }}>
                <Icon name="trash" size={18} color={colors.text3} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
          <Icon name="ambulance" size={22} color={colors.red} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rowName}>SAMU</Text>
            <Text style={styles.rowMeta}>192</Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL('tel:192')} style={styles.callBtn}>
            <Icon name="call-active" size={16} color={colors.red} />
          </TouchableOpacity>
        </View>

        {showAddContact ? (
          <View style={styles.addForm}>
            <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="Nome (ex: Dra. Ana)" placeholderTextColor={colors.text3} />
            <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="Telefone" placeholderTextColor={colors.text3} keyboardType="phone-pad" />
            <View style={styles.typeRow}>
              {(['medico', 'samu', 'outro'] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.typeBtn, contactType === t && styles.typeBtnActive]} onPress={() => setContactType(t)}>
                  <Text style={[styles.typeBtnText, contactType === t && styles.typeBtnTextActive]}>
                    {t === 'medico' ? 'Médico' : t === 'samu' ? 'Emergência' : 'Outro'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formActions}>
              <Button title="Cancelar" variant="outline" onPress={() => setShowAddContact(false)} style={{ flex: 1 }} />
              <Button title="Salvar" onPress={handleAddContact} disabled={!contactName.trim() || !contactPhone.trim()} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <Button title="Adicionar contato" variant="outline" onPress={() => setShowAddContact(true)} style={{ marginTop: 12 }} />
        )}
      </Card>
      )}

      {/* Lembretes de glicemia — responsável e cuidador */}
      {!isMedico && (
        <Card>
          <View style={styles.sectionRow}>
            <Icon name="notifications-active" size={16} color={colors.mint2} />
            <Text style={styles.sectionTitle}>Lembretes de glicemia</Text>
          </View>
          <Text style={styles.notifHint}>
            A Gotinha avisa nos momentos mais importantes do dia para registrar a glicemia.
          </Text>
          <View style={styles.notifToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifToggleLabel}>Ativar lembretes</Text>
              <Text style={styles.notifToggleSub}>
                {notifEnabled
                  ? `${GLUCOSE_REMINDER_SLOTS.length} horários por dia`
                  : 'Desativado'}
              </Text>
            </View>
            {notifLoading ? (
              <ActivityIndicator size="small" color={colors.red} />
            ) : (
              <Switch
                value={notifEnabled}
                onValueChange={async (val) => {
                  setNotifLoading(true);
                  try {
                    if (val) {
                      const granted = await requestNotificationPermission();
                      if (!granted) {
                        Alert.alert(
                          'Permissão necessária',
                          'Ative as notificações nas configurações do celular para receber lembretes.',
                        );
                        setNotifEnabled(false);
                        return;
                      }
                      setNotifEnabled(true);
                      const info = await getNotificationDebugInfo();
                      setNotifDebug(info);
                    } else {
                      await setNotificationsEnabled(false);
                      setNotifEnabled(false);
                    }
                  } finally {
                    setNotifLoading(false);
                  }
                }}
                trackColor={{ false: colors.border, true: colors.mint2 }}
                thumbColor={notifEnabled ? colors.green : '#f4f4f4'}
              />
            )}
          </View>
          {notifEnabled && (
            <View style={styles.notifSlots}>
              {GLUCOSE_REMINDER_SLOTS.map(slot => (
                <Text key={slot.id} style={styles.notifSlotText}>
                  {String(slot.hour).padStart(2, '0')}:{String(slot.minute).padStart(2, '0')} — {slot.label}
                </Text>
              ))}
            </View>
          )}
          {notifDebug && (
            <Text style={styles.notifDebug}>
              {notifDebug.isPhysicalDevice ? 'Celular físico' : 'Emulador — notificações limitadas'}
              {' · '}
              Permissão: {notifDebug.permission}
              {' · '}
              {notifDebug.scheduledCount} agendada(s)
            </Text>
          )}
          <Button
            title={notifTesting ? 'Agendando…' : 'Testar notificação em 10s'}
            variant="outline"
            disabled={notifTesting || !notifEnabled}
            onPress={async () => {
              setNotifTesting(true);
              try {
                await scheduleTestNotification(10);
                Alert.alert(
                  'Teste agendado',
                  'Em cerca de 10 segundos você deve receber uma notificação. Deixe o app em segundo plano para ver no painel do celular.',
                );
                const info = await getNotificationDebugInfo();
                setNotifDebug(info);
              } catch (e) {
                Alert.alert(
                  'Não foi possível testar',
                  e instanceof Error ? e.message : 'Use um celular físico com permissão ativa.',
                );
              } finally {
                setNotifTesting(false);
              }
            }}
            style={{ marginTop: 12 }}
          />
        </Card>
      )}

      {/* Account & privacy */}
      <TouchableOpacity style={styles.accountLink} onPress={() => router.push('/conta')}>
        <Icon name="shield" size={18} color={colors.text2} />
        <Text style={styles.accountLinkText}>Conta e privacidade</Text>
        <Icon name="chevron-right" size={16} color={colors.text3} />
      </TouchableOpacity>
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
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.peach,
    justifyContent: 'center', alignItems: 'center',
  },
  childName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: 12 },
  childMeta: { fontSize: 14, color: colors.text2, marginTop: 4 },
  tagsRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: colors.red,
  },
  editBtnText: { fontSize: 13, color: colors.red, fontWeight: '600' },
  readOnlyNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  readOnlyText: { fontSize: 12, color: colors.text3 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.text3, marginBottom: 8 },
  rowItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  rowItemActive: { backgroundColor: '#FEF2F2' },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.text3, marginTop: 2 },
  miniBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 3 },
  miniBadgeText: { fontSize: 11, fontWeight: '700' },
  callBtn: { padding: 6, borderRadius: 20, backgroundColor: colors.mint, justifyContent: 'center', alignItems: 'center' },
  inviteBox: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 14 },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.red },
  codeContainer: { marginTop: 12, backgroundColor: colors.peach, borderRadius: radius.md, padding: 16, alignItems: 'center', gap: 10 },
  codeLabel: { fontSize: 12, fontWeight: '600', color: colors.text2 },
  codeText: { fontSize: 32, fontWeight: '900', color: colors.text, letterSpacing: 8, textAlign: 'center' },
  codeHint: { fontSize: 12, color: colors.text2, textAlign: 'center', lineHeight: 18, marginHorizontal: 8 },
  codeActions: { width: '100%', gap: 8 },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.card,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.red,
  },
  codeBtnText: { fontSize: 13, fontWeight: '700', color: colors.red },
  disassociateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.red,
  },
  disassociateText: { fontSize: 13, fontWeight: '700', color: colors.red },
  addForm: { marginTop: 12, gap: 8 },
  input: {
    padding: 12, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md,
    fontSize: 14, color: colors.text, backgroundColor: '#F8F9FA',
  },
  codeField: {
    fontSize: 20, fontWeight: '700', textAlign: 'center', letterSpacing: 8,
    borderColor: colors.red, backgroundColor: colors.rose,
  },
  errorText: { fontSize: 12, color: colors.red, textAlign: 'center' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, padding: 8, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
  typeBtnActive: { borderColor: colors.red, backgroundColor: colors.rose },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: colors.text2 },
  typeBtnTextActive: { color: colors.red },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  accountLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  accountLinkText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  authBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.rose,
    borderRadius: radius.md, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.red + '40',
  },
  authBannerTitle: { fontSize: 14, fontWeight: '700', color: colors.red },
  authBannerSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  authBannerOk: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.mint,
    borderRadius: radius.md, padding: 10, marginBottom: 12,
  },
  authBannerOkText: { fontSize: 13, fontWeight: '600', color: '#1E8449' },
  notifHint: { fontSize: 13, color: colors.text2, lineHeight: 19, marginBottom: 12 },
  notifToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifToggleLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  notifToggleSub: { fontSize: 12, color: colors.text3, marginTop: 2 },
  notifSlots: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 4 },
  notifSlotText: { fontSize: 12, color: colors.text3 },
  notifDebug: { fontSize: 11, color: colors.text3, marginTop: 10, lineHeight: 16 },
});
