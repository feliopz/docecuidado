import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getAuthUserId, ensureSession } from './supabase';
import { logError, logEvent } from './log';
import {
  getChild, saveChild,
  getGlucoseReadings, addGlucoseReading,
  getInsulinLogs, addInsulinLog,
  getMeals, addMeal,
  getCaregivers, saveCaregivers,
  getEmergencyContacts, saveEmergencyContacts,
  getLessonProgress, saveLessonProgress,
} from './store';
import {
  Child,
  GlucoseReading,
  InsulinLog,
  Meal,
  Caregiver,
  EmergencyContact,
  LessonProgress,
  Recipe,
  Lesson,
  QuizQuestion,
} from '../types';

// ─── Children ────────────────────────────────────────────────────────────────

export async function upsertChild(child: Child): Promise<void> {
  try {
    // Stamp ownership with auth.uid() so RLS authorizes this and all
    // child-linked rows. ensureSession() covers the race where onboarding
    // finishes before bootstrapSession() completes at cold start.
    const uid = await ensureSession();
    const row = uid ? { ...child, user_id: uid } : child;
    const { error } = await supabase.from('children').upsert(row);
    if (error) throw error;
    void logEvent('child.upsert', { area: 'crianca', ok: true });
  } catch (e) {
    logError('upsertChild', e); // local fallback below
  }
  await saveChild(child);
}

export async function fetchChildById(childId: string): Promise<Child | null> {
  try {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .single();
    if (error) throw error;
    return data as Child;
  } catch (e) {
    logError('fetchChildById', e);
    return null;
  }
}

export async function fetchChild(childId: string): Promise<Child | null> {
  try {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .single();
    if (error) throw error;
    if (data) {
      await saveChild(data as Child);
      return data as Child;
    }
  } catch (e) {
    logError('supabase-db', e);
  }
  return getChild();
}

// ─── Glucose Readings ────────────────────────────────────────────────────────

export async function addGlucoseReadingDB(reading: GlucoseReading): Promise<void> {
  try {
    const uid = await getAuthUserId();
    const { error } = await supabase.from('glucose_readings').insert(uid ? { ...reading, user_id: uid } : reading);
    if (error) throw error;
    void logEvent('glucose.add', { area: 'glicemia', ok: true });
  } catch (e) {
    logError('addGlucoseReadingDB', e);
  }
  await addGlucoseReading(reading);
}

export async function fetchGlucoseReadingsDB(childId: string): Promise<GlucoseReading[]> {
  try {
    const { data, error } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (data && data.length > 0) return data as GlucoseReading[];
  } catch (e) {
    logError('supabase-db', e);
  }
  return getGlucoseReadings();
}

// ─── Insulin Logs ────────────────────────────────────────────────────────────

export async function addInsulinLogDB(log: InsulinLog): Promise<void> {
  try {
    const uid = await getAuthUserId();
    const { error } = await supabase.from('insulin_logs').insert(uid ? { ...log, user_id: uid } : log);
    if (error) throw error;
    void logEvent('insulin.add', { area: 'insulina', ok: true });
  } catch (e) {
    logError('addInsulinLogDB', e);
  }
  await addInsulinLog(log);
}

export async function fetchInsulinLogsDB(childId: string): Promise<InsulinLog[]> {
  try {
    const { data, error } = await supabase
      .from('insulin_logs')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (data && data.length > 0) return data as InsulinLog[];
  } catch (e) {
    logError('supabase-db', e);
  }
  return getInsulinLogs();
}

// ─── Meals ───────────────────────────────────────────────────────────────────

export async function addMealDB(meal: Meal): Promise<void> {
  try {
    const uid = await getAuthUserId();
    const { error } = await supabase.from('meals').insert(uid ? { ...meal, user_id: uid } : meal);
    if (error) throw error;
    void logEvent('meal.add', { area: 'nutricao', ok: true });
  } catch (e) {
    logError('addMealDB', e);
  }
  await addMeal(meal);
}

export async function fetchMealsDB(childId: string): Promise<Meal[]> {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (data && data.length > 0) return data as Meal[];
  } catch (e) {
    logError('supabase-db', e);
  }
  return getMeals();
}

// ─── Caregivers ──────────────────────────────────────────────────────────────

export async function fetchCaregiversDB(childId: string): Promise<Caregiver[]> {
  try {
    const { data, error } = await supabase
      .from('caregivers')
      .select('*')
      .eq('child_id', childId);
    if (error) throw error;
    if (data && data.length > 0) return data as Caregiver[];
  } catch (e) {
    logError('fetchCaregiversDB', e);
  }
  return getCaregivers();
}

export async function deleteCaregiverDB(caregiverId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('caregivers')
      .delete()
      .eq('id', caregiverId);
    if (error) throw error;
  } catch (e) {
    logError('deleteCaregiverDB', e);
  }
  const existing = await getCaregivers();
  await saveCaregivers(existing.filter((c) => c.id !== caregiverId));
}

/**
 * Ensure the responsible (owner) has a role='responsavel' row in `caregivers`,
 * recorded under their own auth.uid() so RLS authorizes it. No-op when signed
 * out (the row is (re)created on sign-in via migrateLocalData). Idempotent.
 */
export async function ensureResponsibleCaregiver(
  childId: string,
  _userId: string,
  name: string,
): Promise<void> {
  const uid = await getAuthUserId();
  if (!uid) return;
  try {
    const { data } = await supabase
      .from('caregivers')
      .select('id')
      .eq('child_id', childId)
      .eq('role', 'responsavel')
      .maybeSingle();
    if (data) return;
    const { error } = await supabase.from('caregivers').insert({
      id: `cg_${uid}_${childId}`,
      child_id: childId,
      user_id: uid,
      name: name || 'Responsável',
      role: 'responsavel',
      relationship: 'Responsável',
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (e) {
    logError('ensureResponsibleCaregiver', e);
  }
}

/** Remove this account's caregiver link to a child (disassociation). */
export async function disassociateCaregiver(childId: string, _userId: string): Promise<void> {
  const uid = await getAuthUserId();
  try {
    if (uid) {
      const { error } = await supabase
        .from('caregivers')
        .delete()
        .eq('child_id', childId)
        .eq('user_id', uid);
      if (error) throw error;
    }
  } catch (e) {
    logError('disassociateCaregiver', e);
  }
  const existing = await getCaregivers();
  await saveCaregivers(existing.filter((c) => c.child_id !== childId));
}

/**
 * Owner-only, atomic deletion of a child and every related row (LGPD erasure).
 * Runs server-side in a single transaction via SECURITY DEFINER RPC, which also
 * verifies ownership — replacing the previous best-effort per-table deletes.
 */
export async function deleteAllChildData(childId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('delete_child_and_data', { p_child_id: childId });
    if (error) throw error;
  } catch (e) {
    logError('deleteAllChildData', e);
  }
}

// ─── Emergency Contacts ─────────────────────────────────────────────────────

export async function addEmergencyContactDB(contact: EmergencyContact): Promise<void> {
  try {
    const { error } = await supabase.from('emergency_contacts').insert(contact);
    if (error) throw error;
  } catch (e) {
    logError('supabase-db', e);
  }
  const existing = await getEmergencyContacts();
  existing.push(contact);
  await saveEmergencyContacts(existing);
}

export async function fetchEmergencyContactsDB(childId: string): Promise<EmergencyContact[]> {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('child_id', childId);
    if (error) throw error;
    if (data && data.length > 0) return data as EmergencyContact[];
  } catch (e) {
    logError('supabase-db', e);
  }
  return getEmergencyContacts();
}

export async function updateEmergencyContactDB(contact: EmergencyContact): Promise<void> {
  try {
    const { error } = await supabase
      .from('emergency_contacts')
      .update(contact)
      .eq('id', contact.id);
    if (error) throw error;
  } catch (e) {
    logError('supabase-db', e);
  }
  const existing = await getEmergencyContacts();
  const updated = existing.map((c) => (c.id === contact.id ? contact : c));
  await saveEmergencyContacts(updated);
}

export async function deleteEmergencyContactDB(contactId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId);
    if (error) throw error;
  } catch (e) {
    logError('supabase-db', e);
  }
  const existing = await getEmergencyContacts();
  const filtered = existing.filter((c) => c.id !== contactId);
  await saveEmergencyContacts(filtered);
}

// ─── Invite Codes ────────────────────────────────────────────────────────────

export async function saveInviteCodeDB(childId: string, code: string): Promise<void> {
  try {
    const { error } = await supabase.from('invite_codes').upsert({ code, child_id: childId, used: false });
    if (error) throw error;
  } catch (e) {
    logError('saveInviteCodeDB', e); // local code still works for sharing
  }
}

/**
 * Redeem an invite code and link the current account to the child.
 *
 * Runs entirely server-side via the SECURITY DEFINER `redeem_invite_code` RPC,
 * which (1) requires an authenticated caller, (2) atomically claims the code
 * (single-use, no TOCTOU race), and (3) records caregiver membership under the
 * caller's auth.uid(). The codes table is no longer client-readable, so codes
 * can't be enumerated. Caregivers/doctors get a transparent anonymous session.
 *
 * Returns the linked child_id, or null if the code is invalid/already used or
 * no session could be established.
 */
export async function redeemInviteCode(
  code: string,
  name = '',
  role: 'caregiver' | 'medico' = 'caregiver',
): Promise<string | null> {
  const uid = await ensureSession();
  if (!uid) return null;
  try {
    const { data, error } = await supabase.rpc('redeem_invite_code', {
      p_code: code.toUpperCase().trim(),
      p_name: name.trim() || null,
      p_role: role,
    });
    if (error) throw error;
    return (data as string | null) ?? null;
  } catch (e) {
    logError('redeemInviteCode', e);
    return null;
  }
}

// ─── Recipes ─────────────────────────────────────────────────────────────────

const RECIPES_CACHE_KEY = 'dc:recipes_cache';

/** Fetch the recipe catalog from Supabase, caching locally for offline use. */
export async function fetchRecipesDB(): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase.from('recipes').select('*');
    if (error) throw error;
    if (data) {
      const recipes = data as Recipe[];
      await AsyncStorage.setItem(RECIPES_CACHE_KEY, JSON.stringify(recipes));
      return recipes;
    }
  } catch (e) {
    logError('fetchRecipesDB', e); // offline / error — fall back to cache
  }
  try {
    const raw = await AsyncStorage.getItem(RECIPES_CACHE_KEY);
    if (raw) return JSON.parse(raw) as Recipe[];
  } catch (e) {
    logError('fetchRecipesDB.cache', e);
  }
  return [];
}

// ─── Lessons & Quiz (public, editable like recipes) ─────────────────────────

const LESSONS_CACHE_KEY = 'dc:lessons_cache';
const QUIZ_CACHE_KEY = 'dc:quiz_cache';

/** Fetch the lesson catalog (ordered), caching locally for offline use. */
export async function fetchLessonsDB(): Promise<Lesson[]> {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('order_index', { ascending: true });
    if (error) throw error;
    if (data) {
      await AsyncStorage.setItem(LESSONS_CACHE_KEY, JSON.stringify(data));
      return data as Lesson[];
    }
  } catch (e) {
    logError('fetchLessonsDB', e);
  }
  try {
    const raw = await AsyncStorage.getItem(LESSONS_CACHE_KEY);
    if (raw) return JSON.parse(raw) as Lesson[];
  } catch (e) {
    logError('fetchLessonsDB.cache', e);
  }
  return [];
}

/** Fetch the quiz questions (ordered), caching locally for offline use. */
export async function fetchQuizDB(): Promise<QuizQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('order_index', { ascending: true });
    if (error) throw error;
    if (data) {
      await AsyncStorage.setItem(QUIZ_CACHE_KEY, JSON.stringify(data));
      return data as QuizQuestion[];
    }
  } catch (e) {
    logError('fetchQuizDB', e);
  }
  try {
    const raw = await AsyncStorage.getItem(QUIZ_CACHE_KEY);
    if (raw) return JSON.parse(raw) as QuizQuestion[];
  } catch (e) {
    logError('fetchQuizDB.cache', e);
  }
  return [];
}

// ─── Lesson Progress ────────────────────────────────────────────────────────

export async function saveLessonProgressDB(
  childId: string,
  progress: LessonProgress,
): Promise<void> {
  try {
    const { error } = await supabase.from('lesson_progress').upsert({
      child_id: childId,
      lesson_id: progress.lesson_id,
      completed_at: progress.completed_at,
    });
    if (error) throw error;
  } catch (e) {
    logError('supabase-db', e);
  }
  const existing = await getLessonProgress();
  if (!existing.includes(progress.lesson_id)) {
    existing.push(progress.lesson_id);
    await saveLessonProgress(existing);
  }
}

export async function fetchLessonProgressDB(childId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('child_id', childId);
    if (error) throw error;
    if (data && data.length > 0) {
      const ids = data.map((d: { lesson_id: string }) => d.lesson_id);
      await saveLessonProgress(ids);
      return ids;
    }
  } catch (e) {
    logError('supabase-db', e);
  }
  return getLessonProgress();
}
