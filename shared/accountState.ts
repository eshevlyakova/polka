import type { AppState, PantryItem } from "./model";
import { basicFoods } from "./basicFoods";
import { parseState } from "./state";

const text = (v: unknown, max: number, empty = false): v is string =>
  typeof v === "string" && v.length <= max && (empty || v.trim().length > 0);
const number = (v: unknown, max: number, min = 0): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const date = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const timestamp = (v: unknown) => text(v, 40) && Number.isFinite(Date.parse(v));
const unique = (items: { id: string }[], max: number) =>
  items.length <= max &&
  items.every((i) => text(i.id, 160)) &&
  new Set(items.map((i) => i.id)).size === items.length;

/** Additional bounds and references for untrusted server writes, including local import. */
export function parseAccountState(value: unknown): AppState {
  try {
    const s = parseState(value);
    const validFoods = new Set(
      [...basicFoods, ...s.customFoods].map((f) => f.id),
    );
    const pantry = (p: PantryItem) =>
      validFoods.has(p.foodId) &&
      number(p.grams, 100_000) &&
      (!p.expiresOn || date(p.expiresOn)) &&
      (p.addedAt === undefined || timestamp(p.addedAt));
    if (
      !unique(s.pantry, 2000) ||
      !unique(s.batches, 5000) ||
      !unique(s.diary, 10_000) ||
      !unique(s.customFoods, 3000) ||
      !s.pantry.every(pantry) ||
      !s.customFoods.every(
        (f) =>
          !basicFoods.some((basic) => basic.id === f.id) &&
          text(f.name, 160) &&
          text(f.emoji, 80, true) &&
          number(f.per100.kcal, 950) &&
          [f.per100.protein, f.per100.fat, f.per100.carbs].every((n) =>
            number(n, 100),
          ) &&
          f.per100.protein + f.per100.fat + f.per100.carbs <= 105,
      ) ||
      !s.batches.every(
        (b) =>
          text(b.recipeName, 160) &&
          timestamp(b.cookedAt) &&
          Number.isInteger(b.servings) &&
          number(b.servings, 50, 1) &&
          Object.values(b.nutrients).every((n) => number(n, 10_000_000)) &&
          (b.estimatedWeightGrams === undefined ||
            number(b.estimatedWeightGrams, 1_000_000, 0.001)),
      ) ||
      !s.diary.every(
        (e) =>
          text(e.name, 160) &&
          date(e.date) &&
          ["Завтрак", "Обед", "Ужин", "Перекус"].includes(e.meal) &&
          text(e.amountLabel, 200, true) &&
          Object.values(e.nutrients).every((n) => number(n, 10_000_000)) &&
          (e.note === undefined || text(e.note, 2000, true)) &&
          (e.source === undefined || text(e.source, 100, true)) &&
          (e.eatenAt === undefined ||
            /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(e.eatenAt) ||
            timestamp(e.eatenAt)) &&
          (e.pantryUsed === undefined ||
            (unique(e.pantryUsed, 2000) && e.pantryUsed.every(pantry))) &&
          (e.batchId === undefined ||
            (s.batches.some((b) => b.id === e.batchId) &&
              number(e.fraction, 1, 0.000001))),
      ) ||
      !number(s.settings.calorieGoal, 20_000) ||
      !text(s.settings.exclusions, 2000, true) ||
      !Number.isInteger(s.settings.maxMinutes) ||
      !number(s.settings.maxMinutes, 2880, 1) ||
      (s.aiRecipes !== undefined &&
        !s.aiRecipes.every((r) =>
          r.ingredients.every(
            (i) =>
              validFoods.has(i.foodId) && number(i.grams, 100_000, 0.000001),
          ),
        ))
    )
      throw new Error();
    for (const batch of s.batches) {
      const consumed = s.diary
        .filter((e) => e.batchId === batch.id)
        .reduce((total, e) => total + (e.fraction ?? 0), 0);
      if (consumed + batch.remainingFraction > 1 + 1e-6) throw new Error();
    }
    // Strip unknown top-level keys. Account identity is NEVER read from state.
    return {
      version: 1,
      pantry: s.pantry,
      batches: s.batches,
      diary: s.diary,
      customFoods: s.customFoods,
      settings: s.settings,
      ...(s.profile === undefined ? {} : { profile: s.profile }),
      ...(s.aiRecipes === undefined ? {} : { aiRecipes: s.aiRecipes }),
      ...(s.recipeFeedback === undefined
        ? {}
        : { recipeFeedback: s.recipeFeedback }),
    };
  } catch {
    throw new Error(
      "Проверь данные: количества, даты, состав продуктов и оставшиеся порции.",
    );
  }
}
