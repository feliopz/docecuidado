import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, fontSize } from '../constants/theme';
import Icon from './Icon';
import { LinkedChild, setActiveChildId } from '../lib/store';
import { AccountType } from '../types';

interface Props {
  children: LinkedChild[];
  activeChildId: string | null;
  accountType: AccountType;
  /** Called after the active child changes so the parent screen can reload data. */
  onChange: () => void;
}

export default function ChildSwitcher({ children, activeChildId, accountType, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const active = children.find(c => c.id === activeChildId) ?? children[0] ?? null;
  const canAdd = accountType === 'responsavel';

  const pick = async (id: string) => {
    await setActiveChildId(id);
    setOpen(false);
    onChange();
  };

  const roleLabel = (r: LinkedChild['role']) =>
    r === 'owner' ? 'Responsável' : r === 'medico' ? 'Médico(a)' : 'Cuidador(a)';

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <View style={styles.avatar}>
          <Icon name={active?.gender === 'boy' ? 'person-add' : 'profile'} size={16} color={colors.red} />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.label}>Cuidando de</Text>
          <Text style={styles.name} numberOfLines={1}>{active?.name ?? 'Criança'}</Text>
        </View>
        {(children.length > 1 || canAdd) && <Icon name="chevron-down" size={16} color={colors.text2} />}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Trocar de criança</Text>
            {children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.row, c.id === active?.id && styles.rowActive]}
                onPress={() => pick(c.id)}
              >
                <View style={styles.avatar}>
                  <Icon name={c.gender === 'boy' ? 'person-add' : 'profile'} size={18} color={c.id === active?.id ? colors.red : colors.text2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, c.id === active?.id && { color: colors.red }]}>{c.name}</Text>
                  <Text style={styles.rowMeta}>{roleLabel(c.role)}</Text>
                </View>
                {c.id === active?.id && <Icon name="checkmark" size={18} color={colors.red} />}
              </TouchableOpacity>
            ))}

            {canAdd && (
              <TouchableOpacity
                style={styles.addRow}
                onPress={() => { setOpen(false); router.push('/nova-crianca'); }}
              >
                <Icon name="add" size={20} color={colors.red} />
                <Text style={styles.addText}>Adicionar outra criança</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.peach,
    justifyContent: 'center', alignItems: 'center',
  },
  label: { fontSize: 11, color: colors.text3 },
  name: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start' },
  sheet: {
    backgroundColor: colors.card, marginTop: 100, marginHorizontal: 16,
    borderRadius: radius.lg, padding: 16, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  sheetTitle: { fontSize: 13, fontWeight: '700', color: colors.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.md },
  rowActive: { backgroundColor: '#FEF2F2' },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.text3, marginTop: 1 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 8,
    marginTop: 4, borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  addText: { fontSize: 14, fontWeight: '700', color: colors.red },
});
