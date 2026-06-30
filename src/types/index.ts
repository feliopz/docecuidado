export type GlucoseStatus = 'green' | 'yellow' | 'red';

export type InsulinType = 'rápida' | 'basal' | 'ultra-rápida';

export type MealMoment = 'jejum' | 'antes_comer' | 'depois_comer' | 'antes_dormir';

export type CaregiverRole = 'responsavel' | 'admin' | 'caregiver' | 'medico';

export type AccountType = 'responsavel' | 'cuidador' | 'medico';

export type Diagnosis = 'dm1' | 'dm2' | 'outro' | 'nao_sei';

export type GlycemicIndex = 'baixo' | 'médio' | 'alto';

export interface Child {
  id: string;
  name: string;
  birthdate?: string;
  diagnosis_date?: string;
  diagnosis?: Diagnosis;
  insulin_types: InsulinType[];
  glucose_target_min: number;
  glucose_target_max: number;
  photo_url?: string;
  gender?: 'boy' | 'girl';
  allergies?: Allergen[];
}

// ─── Recipes / food allergies ──────────────────────────────────────────────

/** Common childhood food allergens used to deterministically exclude recipes. */
export type Allergen =
  | 'leite'        // milk / lactose
  | 'ovo'          // egg
  | 'gluten'       // wheat / gluten
  | 'amendoim'     // peanut
  | 'castanhas'    // tree nuts
  | 'soja'         // soy
  | 'peixe'        // fish
  | 'frutos_do_mar'// shellfish
  | 'gergelim'     // sesame
  | 'mel'          // honey (infants)
  | 'corantes';    // food dyes/additives

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  leite: 'Leite / lactose',
  ovo: 'Ovo',
  gluten: 'Glúten / trigo',
  amendoim: 'Amendoim',
  castanhas: 'Castanhas / nozes',
  soja: 'Soja',
  peixe: 'Peixe',
  frutos_do_mar: 'Frutos do mar',
  gergelim: 'Gergelim',
  mel: 'Mel',
  corantes: 'Corantes / aditivos',
};

/** Which meal a recipe fits. */
export type MealSlot = 'cafe_da_manha' | 'almoco' | 'jantar' | 'lanche';

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  cafe_da_manha: 'Café da manhã',
  almoco: 'Almoço',
  jantar: 'Jantar',
  lanche: 'Lanche',
};

/**
 * Recommendation categories. The AI's ONLY job is to choose ONE of these per
 * meal slot based on the child's current situation; the system then pulls and
 * ranks recipes tagged with that category (deterministic, no further AI).
 */
export type RecipeCategory =
  | 'equilibrada'        // balanced, default everyday choice
  | 'baixo_indice_glicemico' // low GI — for hyperglycemia tendency
  | 'rica_fibra'         // high fiber — slows glucose absorption
  | 'rica_proteina'      // protein-forward — satiety, stable glucose
  | 'baixo_carbo'        // low carb — recent highs
  | 'carbo_complexo'     // slow/complex carbs — recent lows / pre-activity
  | 'pos_hipo'           // recovery after a hypo event
  | 'pos_hiper'          // gentle option after a hyper event
  | 'lanche_leve';       // light snack between meals

export const RECIPE_CATEGORY_LABELS: Record<RecipeCategory, string> = {
  equilibrada: 'Equilibrada',
  baixo_indice_glicemico: 'Baixo índice glicêmico',
  rica_fibra: 'Rica em fibras',
  rica_proteina: 'Rica em proteínas',
  baixo_carbo: 'Baixo carboidrato',
  carbo_complexo: 'Carboidrato complexo',
  pos_hipo: 'Pós-hipoglicemia',
  pos_hiper: 'Pós-hiperglicemia',
  lanche_leve: 'Lanche leve',
};

export interface RecipeNutrition {
  servings: number;       // how many portions the recipe yields
  calories: number;       // kcal per serving
  carbs_g: number;        // carbohydrates per serving (CRITICAL for T1D carb counting)
  protein_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  glycemic_index?: GlycemicIndex;
}

export interface Recipe {
  id: string;                  // stable kebab-case slug
  title: string;
  description: string;         // 1–2 sentence summary
  image_url: string;           // remote URL or bundled require path string
  meal_slots: MealSlot[];      // which meals it suits (>=1)
  categories: RecipeCategory[];// recommendation categories (>=1)
  allergens: Allergen[];       // allergens this recipe CONTAINS (for exclusion)
  prep_minutes: number;
  difficulty: 'facil' | 'media' | 'dificil';
  ingredients: string[];       // human-readable lines
  steps: string[];             // ordered preparation steps
  nutrition: RecipeNutrition;
  diabetes_notes?: string;     // why/when it's good for a child with diabetes
  tags?: string[];             // free-form keywords for search/extra filtering
}

export const DIAGNOSIS_LABELS: Record<Diagnosis, string> = {
  dm1: 'Diabetes Mellitus Tipo 1',
  dm2: 'Diabetes Mellitus Tipo 2',
  outro: 'Outro tipo de diabetes',
  nao_sei: 'Diabetes (tipo a confirmar)',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  responsavel: 'Responsável',
  cuidador: 'Cuidador(a)',
  medico: 'Médico(a)',
};

export interface GlucoseReading {
  id: string;
  child_id: string;
  reading_value: number;
  reading_time: string;
  moment: MealMoment;
  recorded_by: string;
  created_at: string;
}

export interface InsulinLog {
  id: string;
  child_id: string;
  insulin_type: InsulinType;
  dose_units: number;
  applied_time: string;
  recorded_by: string;
  created_at: string;
}

export interface Meal {
  id: string;
  child_id: string;
  meal_time: string;
  description: string;
  calories?: number;
  carbs_grams?: number;
  protein_grams?: number;
  fat_grams?: number;
  glycemic_index?: GlycemicIndex;
  image_url?: string;
  recorded_by: string;
  created_at: string;
}

export interface Caregiver {
  id: string;
  child_id: string;
  user_id: string;
  role: CaregiverRole;
  name: string;
  relationship?: string;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  child_id: string;
  name: string;
  phone: string;
  type: 'medico' | 'samu' | 'outro';
}

export interface LessonProgress {
  lesson_id: string;
  completed_at: string;
}

export type TimelineEntry =
  | { type: 'glucose'; data: GlucoseReading }
  | { type: 'insulin'; data: InsulinLog }
  | { type: 'meal'; data: Meal };

export function getGlucoseStatus(
  value: number,
  min: number,
  max: number,
): GlucoseStatus {
  if (value < min || value > max) return 'red';
  if (value > max - 20) return 'yellow';
  return 'green';
}

export function getGlucoseIcon(status: GlucoseStatus): string {
  switch (status) {
    case 'green': return 'happy';
    case 'yellow': return 'alert';
    case 'red': return 'sad';
  }
}

export function getGlucoseLabel(status: GlucoseStatus): string {
  switch (status) {
    case 'green': return 'tá tranquilo';
    case 'yellow': return 'vale checar';
    case 'red': return 'atenção agora';
  }
}

export const INSULIN_LABELS: Record<InsulinType, { icon: string; label: string }> = {
  'rápida': { icon: 'flash', label: 'Rápida' },
  'basal': { icon: 'moon', label: 'Basal' },
  'ultra-rápida': { icon: 'hourglass', label: 'Ultra-rápida' },
};

export const MOMENT_LABELS: Record<MealMoment, { icon: string; label: string }> = {
  'jejum': { icon: 'sunny', label: 'Jejum' },
  'antes_comer': { icon: 'restaurant', label: 'Antes de comer' },
  'depois_comer': { icon: 'restaurant', label: 'Depois de comer' },
  'antes_dormir': { icon: 'moon', label: 'Antes de dormir' },
};

export const CAREGIVER_RELATIONSHIPS: Record<string, { icon: string; label: string }> = {
  'mae': { icon: 'female', label: 'Mãe' },
  'pai': { icon: 'male', label: 'Pai' },
  'avo': { icon: 'person', label: 'Avó' },
  'ava': { icon: 'person', label: 'Avô' },
  'tio': { icon: 'person', label: 'Tio/Tia' },
  'baba': { icon: 'person', label: 'Babá' },
  'outro': { icon: 'person', label: 'Outro' },
};

// ─── Learning content (DB-driven, editable like recipes) ────────────────────

/** A lesson card. `icon_svg` is raw SVG markup rendered with currentColor. */
export interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  icon_svg: string;
  order_index: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation_correct: string;
  explanation_wrong: string;
  order_index: number;
}
