import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { generateInviteCode } from './id';
import { logError } from './log';
import { Child, GlucoseReading, InsulinLog, Meal, Caregiver, EmergencyContact, AccountType } from '../types';

const KEYS = {
  ONBOARDED: 'dc:onboarded',
  CHILD: 'dc:child',
  GLUCOSE: 'dc:glucose',
  INSULIN: 'dc:insulin',
  MEALS: 'dc:meals',
  LESSON_PROGRESS: 'dc:lesson_progress',
  LLM_CACHE: 'dc:llm_cache',
  EMERGENCY_CONTACTS: 'dc:emergency_contacts',
  CAREGIVERS: 'dc:caregivers',
  CAREGIVER_ROLE: 'dc:caregiver_role',
  AUTH_PROMPTED: 'dc:auth_prompted',
  ACTIVE_CHILD_ID: 'dc:active_child_id',
  LINKED_CHILDREN: 'dc:linked_children',
  ACCOUNT_TYPE: 'dc:account_type',
  ACCOUNT_NAME: 'dc:account_name',
  AI_CONSENT: 'dc:ai_consent',
} as const;

// --- AI processing consent (LGPD) ---
// Whether the responsible has agreed that the child's data may be sent to the
// third-party AI provider for insights. Defaults to FALSE (opt-in).

export async function getAIConsent(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.AI_CONSENT)) === 'true';
}

export async function setAIConsent(consented: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.AI_CONSENT, String(consented));
}

// --- Account type & name (set once per account) ---

export async function getAccountType(): Promise<AccountType> {
  const v = await AsyncStorage.getItem(KEYS.ACCOUNT_TYPE);
  return (v as AccountType) ?? 'responsavel';
}

export async function setAccountType(type: AccountType): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACCOUNT_TYPE, type);
}

export async function getAccountName(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.ACCOUNT_NAME)) ?? '';
}

export async function setAccountName(name: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACCOUNT_NAME, name);
}

/** Stable local id for this account/device (used as caregivers.user_id). */
export async function getAccountId(): Promise<string> {
  const KEY = 'dc:account_id';
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await AsyncStorage.setItem(KEY, id);
  }
  return id;
}

/** Display name used for `recorded_by` on any new record. */
export async function getRecorderName(): Promise<string> {
  const name = await getAccountName();
  if (name) return name;
  const type = await getAccountType();
  return type === 'medico' ? 'Médico(a)' : type === 'cuidador' ? 'Cuidador(a)' : 'Responsável';
}

// --- Linked children (multi-child support) ---

export interface LinkedChild {
  id: string;
  name: string;
  gender?: 'boy' | 'girl';
  role: 'owner' | 'caregiver' | 'medico';
}

export async function getLinkedChildren(): Promise<LinkedChild[]> {
  const raw = await AsyncStorage.getItem(KEYS.LINKED_CHILDREN);
  return raw ? JSON.parse(raw) : [];
}

export async function addLinkedChild(lc: LinkedChild): Promise<void> {
  const list = await getLinkedChildren();
  const filtered = list.filter(c => c.id !== lc.id);
  await AsyncStorage.setItem(KEYS.LINKED_CHILDREN, JSON.stringify([...filtered, lc]));
}

export async function removeLinkedChild(childId: string): Promise<void> {
  const list = await getLinkedChildren();
  const remaining = list.filter(c => c.id !== childId);
  await AsyncStorage.setItem(KEYS.LINKED_CHILDREN, JSON.stringify(remaining));
  await AsyncStorage.removeItem(`dc:child_${childId}`);
  // If the removed child was active, switch to the first remaining one.
  const active = await getActiveChildId();
  if (active === childId) {
    if (remaining.length > 0) {
      await setActiveChildId(remaining[0].id);
    } else {
      await AsyncStorage.removeItem(KEYS.ACTIVE_CHILD_ID);
    }
  }
}

export async function getActiveChildId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ACTIVE_CHILD_ID);
}

export async function setActiveChildId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVE_CHILD_ID, id);
}

// --- Onboarding ---

export async function isOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
  return val === 'true';
}

export async function setOnboarded(val: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDED, String(val));
}

// --- Child ---

export async function getChild(): Promise<Child | null> {
  const activeId = await getActiveChildId();
  if (activeId) {
    const raw = await AsyncStorage.getItem(`dc:child_${activeId}`);
    if (raw) return JSON.parse(raw) as Child;
  }
  const raw = await AsyncStorage.getItem(KEYS.CHILD);
  return raw ? JSON.parse(raw) as Child : null;
}

export async function saveChild(child: Child): Promise<void> {
  await AsyncStorage.setItem(KEYS.CHILD, JSON.stringify(child));
  await AsyncStorage.setItem(`dc:child_${child.id}`, JSON.stringify(child));
  await setActiveChildId(child.id);
  await addLinkedChild({ id: child.id, name: child.name, gender: child.gender, role: 'owner' });
}

export async function saveChildById(child: Child): Promise<void> {
  await AsyncStorage.setItem(`dc:child_${child.id}`, JSON.stringify(child));
}

export async function getChildById(childId: string): Promise<Child | null> {
  const raw = await AsyncStorage.getItem(`dc:child_${childId}`);
  return raw ? JSON.parse(raw) as Child : null;
}

// --- Glucose ---

export async function getGlucoseReadings(): Promise<GlucoseReading[]> {
  const raw = await AsyncStorage.getItem(KEYS.GLUCOSE);
  return raw ? JSON.parse(raw) : [];
}

export async function addGlucoseReading(reading: GlucoseReading): Promise<void> {
  const readings = await getGlucoseReadings();
  readings.unshift(reading);
  await AsyncStorage.setItem(KEYS.GLUCOSE, JSON.stringify(readings));
}

// --- Insulin ---

export async function getInsulinLogs(): Promise<InsulinLog[]> {
  const raw = await AsyncStorage.getItem(KEYS.INSULIN);
  return raw ? JSON.parse(raw) : [];
}

export async function addInsulinLog(log: InsulinLog): Promise<void> {
  const logs = await getInsulinLogs();
  logs.unshift(log);
  await AsyncStorage.setItem(KEYS.INSULIN, JSON.stringify(logs));
}

// --- Meals ---

export async function getMeals(): Promise<Meal[]> {
  const raw = await AsyncStorage.getItem(KEYS.MEALS);
  return raw ? JSON.parse(raw) : [];
}

export async function addMeal(meal: Meal): Promise<void> {
  const meals = await getMeals();
  meals.unshift(meal);
  await AsyncStorage.setItem(KEYS.MEALS, JSON.stringify(meals));
}

// --- Lesson Progress ---

export async function getLessonProgress(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.LESSON_PROGRESS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveLessonProgress(completedIds: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.LESSON_PROGRESS, JSON.stringify(completedIds));
}

// --- LLM Cache ---

export async function getLLMCache(): Promise<Record<string, { response: string; timestamp: number }>> {
  const raw = await AsyncStorage.getItem(KEYS.LLM_CACHE);
  return raw ? JSON.parse(raw) : {};
}

export async function setLLMCache(cache: Record<string, { response: string; timestamp: number }>): Promise<void> {
  await AsyncStorage.setItem(KEYS.LLM_CACHE, JSON.stringify(cache));
}

// --- Emergency Contacts ---

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const raw = await AsyncStorage.getItem(KEYS.EMERGENCY_CONTACTS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.EMERGENCY_CONTACTS, JSON.stringify(contacts));
}

// --- Caregivers ---

export async function getCaregivers(): Promise<Caregiver[]> {
  const raw = await AsyncStorage.getItem(KEYS.CAREGIVERS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCaregivers(caregivers: Caregiver[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CAREGIVERS, JSON.stringify(caregivers));
}

// --- Caregiver Role ---

export async function getCaregiverRole(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.CAREGIVER_ROLE);
}

export async function saveCaregiverRole(role: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.CAREGIVER_ROLE, role);
}

// --- Auth Prompted ---

export async function getAuthPrompted(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.AUTH_PROMPTED);
}

export async function setAuthPrompted(timestamp: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.AUTH_PROMPTED, timestamp);
}

// --- Invite Code ---

async function generateNewInviteCode(childId: string): Promise<string> {
  const key = `dc:invite_${childId}`;
  const code = generateInviteCode(6);
  await AsyncStorage.setItem(key, code);
  void (async () => {
    try { await supabase.from('invite_codes').upsert({ code, child_id: childId, used: false }); }
    catch (e) { logError('store.generateInviteCode', e); }
  })();
  return code;
}

export async function getOrCreateInviteCode(childId: string): Promise<string> {
  const key = `dc:invite_${childId}`;
  const existing = await AsyncStorage.getItem(key);
  if (existing) {
    // Check if code was already used in Supabase — if so, generate new one
    try {
      const { data } = await supabase
        .from('invite_codes')
        .select('used')
        .eq('code', existing)
        .maybeSingle();
      if (data && data.used) {
        // Code was redeemed — generate fresh code for next caregiver
        await AsyncStorage.removeItem(key);
        return generateNewInviteCode(childId);
      }
      if (!data) {
        // Code not in Supabase yet — sync it
        void (async () => {
          try { await supabase.from('invite_codes').upsert({ code: existing, child_id: childId, used: false }); }
          catch (e) { logError('store.syncInviteCode', e); }
        })();
      }
    } catch (e) { logError('store.getOrCreateInviteCode', e); }
    return existing;
  }
  return generateNewInviteCode(childId);
}

export async function forceNewInviteCode(childId: string): Promise<string> {
  await AsyncStorage.removeItem(`dc:invite_${childId}`);
  return generateNewInviteCode(childId);
}

export async function getInviteCode(childId: string): Promise<string | null> {
  return AsyncStorage.getItem(`dc:invite_${childId}`);
}

// --- Report History ---

export interface ReportRecord {
  id: string;
  generated_at: string;
  period: 'semana' | 'mes' | 'tudo';
  child_name: string;
  readings_count: number;
  avg: number;
  peak: number;
  low: number;
  in_target_pct: number;
  target_min: number;
  target_max: number;
}

const REPORT_HISTORY_KEY = 'dc:report_history';

export async function getReportHistory(): Promise<ReportRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(REPORT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveReportRecord(record: ReportRecord): Promise<void> {
  const history = await getReportHistory();
  history.unshift(record);
  const trimmed = history.slice(0, 50);
  await AsyncStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(trimmed));
}

// --- Clear ---

export async function clearAll(): Promise<void> {
  const allKeys = [
    ...Object.values(KEYS),
    REPORT_HISTORY_KEY,
    'dc:llm_last_auto',
    'dc:llm_cache',
  ];
  await AsyncStorage.multiRemove(allKeys);
  const keys = await AsyncStorage.getAllKeys();
  const patternKeys = keys.filter(k => k.startsWith('dc:invite_') || k.startsWith('dc:child_'));
  if (patternKeys.length > 0) await AsyncStorage.multiRemove(patternKeys);
}
