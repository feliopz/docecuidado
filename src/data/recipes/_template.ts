import { Recipe } from '../../types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  RECIPE TEMPLATE — copy this file to create a new recipe.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Steps:
 *   1. Duplicate this file as `<slug>.ts` (kebab-case, same as `id`).
 *   2. Fill EVERY field below. Do not leave placeholders.
 *   3. Import it in `index.ts` and push it into the RECIPES array.
 *
 *  FIELD RULES (see docs/features/10-receitas-recomendadas.md for the full spec):
 *   - id:          unique kebab-case slug, identical to the file name.
 *   - title:       short, appetizing name.
 *   - description: 1–2 sentences a parent can skim.
 *   - image_url:   a real image URL (or a bundled asset path string).
 *   - meal_slots:  at least one of 'cafe_da_manha' | 'almoco' | 'jantar' | 'lanche'.
 *   - categories:  at least one RecipeCategory. These drive the AI recommendation.
 *                  Tag honestly — a low-carb dish is NOT 'pos_hipo'.
 *   - allergens:   EVERY allergen the recipe contains. This is the DETERMINISTIC
 *                  exclusion filter: a child allergic to any listed allergen will
 *                  NEVER be recommended this recipe. When in doubt, include it.
 *   - nutrition:   per serving. carbs_g is critical for T1D carb counting.
 *   - diabetes_notes: why/when this is a good choice for a child with diabetes.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const TEMPLATE_RECIPE: Recipe = {
  id: 'slug-da-receita',
  title: '',
  description: '',
  image_url: '',
  meal_slots: [],          // ex.: ['cafe_da_manha', 'lanche']
  categories: [],          // ex.: ['baixo_indice_glicemico', 'rica_fibra']
  allergens: [],           // ex.: ['gluten', 'ovo'] — TUDO que a receita contém
  prep_minutes: 0,
  difficulty: 'facil',     // 'facil' | 'media' | 'dificil'
  ingredients: [
    // 'Ex.: 2 ovos',
    // 'Ex.: 1/2 xícara de aveia em flocos',
  ],
  steps: [
    // 'Ex.: Misture os ingredientes secos.',
    // 'Ex.: Adicione os ovos e mexa até virar massa.',
  ],
  nutrition: {
    servings: 1,
    calories: 0,
    carbs_g: 0,
    protein_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    glycemic_index: 'baixo', // 'baixo' | 'médio' | 'alto'
  },
  diabetes_notes: '',
  tags: [],
};
