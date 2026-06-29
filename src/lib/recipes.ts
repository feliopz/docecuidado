import {
  Recipe,
  Allergen,
  MealSlot,
  RecipeCategory,
  Child,
  GlucoseReading,
  getGlucoseStatus,
} from '../types';

export const DAILY_SLOTS: MealSlot[] = ['cafe_da_manha', 'almoco', 'jantar'];

/**
 * Deterministic allergy filter. A recipe is excluded if it contains ANY allergen
 * the child is allergic to. This never calls AI — it's a hard safety rule.
 */
export function filterByAllergies(recipes: Recipe[], allergies: Allergen[] = []): Recipe[] {
  if (allergies.length === 0) return recipes;
  const set = new Set(allergies);
  return recipes.filter(r => !r.allergens.some(a => set.has(a)));
}

/** Relevance score for ranking — higher is better. Pure/deterministic. */
function score(recipe: Recipe, category: RecipeCategory, slot: MealSlot): number {
  let s = 0;
  if (recipe.categories.includes(category)) s += 100;
  if (recipe.meal_slots.includes(slot)) s += 50;
  const gi = recipe.nutrition.glycemic_index;
  s += gi === 'baixo' ? 10 : gi === 'médio' ? 5 : 0;
  // Mild preference for moderate carb counts (closer to ~30g/serving).
  const carbs = recipe.nutrition.carbs_g ?? 30;
  s += Math.max(0, 20 - Math.abs(carbs - 30) / 3);
  return s;
}

export interface RecommendQuery {
  recipes: Recipe[];
  slot: MealSlot;
  category: RecipeCategory;
  allergies?: Allergen[];
  limit?: number;
}

/**
 * Returns the top recipes for a slot + category, allergy-filtered and ranked.
 * NEVER returns the whole database — capped at `limit` (default 10).
 */
export function getRecommendations({ recipes, slot, category, allergies = [], limit = 10 }: RecommendQuery): Recipe[] {
  const safe = filterByAllergies(recipes, allergies);
  return safe
    .map(r => ({ r, sc: score(r, category, slot) }))
    .filter(x => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, limit)
    .map(x => x.r);
}

/** One recommended recipe per daily slot (café/almoço/jantar). */
export function getDailyRecommendations(
  recipes: Recipe[],
  categories: Record<MealSlot, RecipeCategory>,
  allergies: Allergen[] = [],
): Partial<Record<MealSlot, Recipe>> {
  const out: Partial<Record<MealSlot, Recipe>> = {};
  for (const slot of DAILY_SLOTS) {
    const top = getRecommendations({ recipes, slot, category: categories[slot], allergies, limit: 1 });
    if (top[0]) out[slot] = top[0];
  }
  return out;
}

/**
 * DETERMINISTIC situation → category mapping. Used as a fallback when the AI is
 * throttled/unavailable, and as the shape the AI fills in. Based on the most
 * recent reading and simple trend over the last few readings.
 */
export function analyzeSituation(child: Child | null, recent: GlucoseReading[]): Record<MealSlot, RecipeCategory> {
  const min = child?.glucose_target_min ?? 70;
  const max = child?.glucose_target_max ?? 180;
  const last = recent[0];
  let base: RecipeCategory = 'equilibrada';

  if (last) {
    const status = getGlucoseStatus(last.reading_value, min, max);
    const recentHigh = recent.slice(0, 4).filter(r => r.reading_value > max).length;
    const recentLow = recent.slice(0, 4).filter(r => r.reading_value < min).length;
    if (last.reading_value < min) base = 'pos_hipo';
    else if (last.reading_value > max) base = 'pos_hiper';
    else if (recentHigh >= 2) base = 'baixo_indice_glicemico';
    else if (recentLow >= 2) base = 'carbo_complexo';
    else if (status === 'green') base = 'equilibrada';
  }

  return {
    cafe_da_manha: base === 'pos_hipo' ? 'carbo_complexo' : base,
    almoco: base,
    jantar: base === 'pos_hiper' ? 'baixo_indice_glicemico' : base,
    lanche: 'lanche_leve',
  };
}

