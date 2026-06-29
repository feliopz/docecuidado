import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
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
} from '../types';

// ─── Children ────────────────────────────────────────────────────────────────

export async function upsertChild(child: Child): Promise<void> {
  try {
    const { error } = await supabase.from('children').upsert(child);
    if (error) throw error;
  } catch {
    // fallback: always persist locally
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
  } catch {
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
  } catch {
    // fallback
  }
  return getChild();
}

// ─── Glucose Readings ────────────────────────────────────────────────────────

export async function addGlucoseReadingDB(reading: GlucoseReading): Promise<void> {
  try {
    const { error } = await supabase.from('glucose_readings').insert(reading);
    if (error) throw error;
  } catch {
    // fallback
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
  } catch {
    // fallback
  }
  return getGlucoseReadings();
}

// ─── Insulin Logs ────────────────────────────────────────────────────────────

export async function addInsulinLogDB(log: InsulinLog): Promise<void> {
  try {
    const { error } = await supabase.from('insulin_logs').insert(log);
    if (error) throw error;
  } catch {
    // fallback
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
  } catch {
    // fallback
  }
  return getInsulinLogs();
}

// ─── Meals ───────────────────────────────────────────────────────────────────

export async function addMealDB(meal: Meal): Promise<void> {
  try {
    const { error } = await supabase.from('meals').insert(meal);
    if (error) throw error;
  } catch {
    // fallback
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
  } catch {
    // fallback
  }
  return getMeals();
}

// ─── Caregivers ──────────────────────────────────────────────────────────────

export async function addCaregiverDB(caregiver: Caregiver): Promise<void> {
  try {
    const { error } = await supabase.from('caregivers').insert(caregiver);
    if (error) throw error;
  } catch {
    // fallback
  }
  const existing = await getCaregivers();
  existing.push(caregiver);
  await saveCaregivers(existing);
}

export async function fetchCaregiversDB(childId: string): Promise<Caregiver[]> {
  try {
    const { data, error } = await supabase
      .from('caregivers')
      .select('*')
      .eq('child_id', childId);
    if (error) throw error;
    if (data && data.length > 0) return data as Caregiver[];
  } catch {
    // fallback
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
  } catch {
    // fallback
  }
  const existing = await getCaregivers();
  const filtered = existing.filter((c) => c.id !== caregiverId);
  await saveCaregivers(filtered);
}

/**
 * Ensure the responsible (owner) has a row in `caregivers` with role='responsavel',
 * so caregivers/doctors can see who the responsible is (badge). Idempotent per (child,user).
 */
export async function ensureResponsibleCaregiver(
  childId: string,
  userId: string,
  name: string,
): Promise<void> {
  try {
    const { data } = await supabase
      .from('caregivers')
      .select('id')
      .eq('child_id', childId)
      .eq('role', 'responsavel')
      .maybeSingle();
    if (data) return;
    await supabase.from('caregivers').insert({
      id: `cg_${userId}_${childId}`,
      child_id: childId,
      user_id: userId,
      name: name || 'Responsável',
      role: 'responsavel',
      relationship: 'Responsável',
      created_at: new Date().toISOString(),
    });
  } catch {
    // best-effort
  }
}

/**
 * Associate the current account (caregiver/doctor) with a child by inserting a
 * `caregivers` row. This is what makes the caregiver appear on the responsible's app.
 */
export async function associateAsCaregiver(
  childId: string,
  userId: string,
  name: string,
  role: 'caregiver' | 'medico',
): Promise<void> {
  await addCaregiverDB({
    id: `cg_${userId}_${childId}`,
    child_id: childId,
    user_id: userId,
    name: name || (role === 'medico' ? 'Médico(a)' : 'Cuidador(a)'),
    role,
    relationship: role === 'medico' ? 'Médico(a)' : 'Cuidador(a)',
    created_at: new Date().toISOString(),
  });
}

/** Remove this account's caregiver link to a child (disassociation). */
export async function disassociateCaregiver(childId: string, userId: string): Promise<void> {
  try {
    await supabase
      .from('caregivers')
      .delete()
      .eq('child_id', childId)
      .eq('user_id', userId);
  } catch {
    // best-effort
  }
  const existing = await getCaregivers();
  await saveCaregivers(existing.filter(c => !(c.child_id === childId && c.user_id === userId)));
}

/** Delete all rows for a child across every table (LGPD — responsible deleting account). */
export async function deleteAllChildData(childId: string): Promise<void> {
  const tables = ['glucose_readings', 'insulin_logs', 'meals', 'caregivers', 'emergency_contacts', 'lesson_progress', 'invite_codes'] as const;
  for (const t of tables) {
    try { await supabase.from(t).delete().eq('child_id', childId); } catch {}
  }
  try { await supabase.from('children').delete().eq('id', childId); } catch {}
}

// ─── Emergency Contacts ─────────────────────────────────────────────────────

export async function addEmergencyContactDB(contact: EmergencyContact): Promise<void> {
  try {
    const { error } = await supabase.from('emergency_contacts').insert(contact);
    if (error) throw error;
  } catch {
    // fallback
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
  } catch {
    // fallback
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
  } catch {
    // fallback
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
  } catch {
    // fallback
  }
  const existing = await getEmergencyContacts();
  const filtered = existing.filter((c) => c.id !== contactId);
  await saveEmergencyContacts(filtered);
}

// ─── Invite Codes ────────────────────────────────────────────────────────────

export async function saveInviteCodeDB(childId: string, code: string): Promise<void> {
  try {
    await supabase.from('invite_codes').upsert({ code, child_id: childId, used: false });
  } catch {
    // no-op — local code still works for sharing
  }
}

export async function redeemInviteCode(code: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('child_id, used')
      .eq('code', code.toUpperCase().trim())
      .single();
    if (error || !data || data.used) return null;
    await supabase
      .from('invite_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('code', code.toUpperCase().trim());
    return data.child_id as string;
  } catch {
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
  } catch {
    // offline / error — fall back to cache
  }
  try {
    const raw = await AsyncStorage.getItem(RECIPES_CACHE_KEY);
    if (raw) return JSON.parse(raw) as Recipe[];
  } catch {}
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
  } catch {
    // fallback
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
  } catch {
    // fallback
  }
  return getLessonProgress();
}
