import { Recipe } from '../../types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  RECIPE FORMAT REFERENCE  (recipes now live in Supabase, table `recipes`)
 * ─────────────────────────────────────────────────────────────────────────────
 *  The app loads recipes at runtime via `fetchRecipesDB()` (src/lib/supabase-db.ts),
 *  cached locally. This file is NO LONGER the data source — it stays as the
 *  TypeScript shape/format reference, alongside `_template.ts`.
 *
 *  To add recipes in bulk, insert rows into the Supabase `recipes` table (see
 *  scripts/ + docs/features/10-receitas-recomendadas.md). Each row matches the
 *  `Recipe` type. This array stays EMPTY.
 *
 *  HOW TO ADD RECIPES (scales to hundreds):
 *   1. Copy `_template.ts` → `<slug>.ts` (e.g. `panqueca-de-aveia.ts`).
 *   2. Fill EVERY required field (see `docs/features/10-receitas-recomendadas.md`
 *      for the full spec of mandatory fields and category/allergen rules).
 *   3. Import it here and add it to the RECIPES array below.
 *
 *  Or, for bulk, keep recipes grouped by file (e.g. `cafe-da-manha.ts` exporting
 *  a Recipe[]) and spread them into RECIPES.
 *
 *  The recommendation engine (`src/lib/recipes.ts`) reads ONLY this array. No
 *  recipe is hardcoded anywhere else.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const RECIPES: Recipe[] = [
  // ...nenhuma receita cadastrada ainda. Veja _template.ts.
];
