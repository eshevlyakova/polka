import { validateProfile } from "../domain/profile";
import { emptyState, type AppState, type Nutrients } from "../domain/model";
export interface StateRepository {
  load(): AppState;
  save(state: AppState): void;
}
const finite = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;
const nutrients = (n: unknown): n is Nutrients =>
  !!n &&
  typeof n === "object" &&
  ["kcal", "protein", "fat", "carbs"].every((k) =>
    finite((n as Record<string, unknown>)[k]),
  );
export function parseState(value: unknown): AppState {
  const s = value as AppState;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.pantry) ||
    !Array.isArray(s.diary) ||
    !Array.isArray(s.batches) ||
    !Array.isArray(s.customFoods) ||
    !s.settings
  )
    throw new Error("Неподдерживаемый формат данных");
  if (
    !s.pantry.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.foodId === "string" &&
        finite(p.grams) &&
        typeof p.expiresOn === "string",
    ) ||
    !s.diary.every(
      (e) =>
        typeof e.id === "string" &&
        typeof e.name === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        nutrients(e.nutrients) &&
        typeof e.meal === "string" &&
        typeof e.amountLabel === "string" &&
        typeof e.approximate === "boolean" &&
        (e.note === undefined || typeof e.note === "string") &&
        (e.eatenAt === undefined || typeof e.eatenAt === "string") &&
        (e.source === undefined || typeof e.source === "string") &&
        (e.fraction === undefined || finite(e.fraction)),
    ) ||
    !s.batches.every(
      (b) =>
        typeof b.id === "string" &&
        typeof b.recipeName === "string" &&
        typeof b.cookedAt === "string" &&
        nutrients(b.nutrients) &&
        finite(b.remainingFraction) &&
        b.remainingFraction <= 1 &&
        finite(b.servings) &&
        b.servings > 0,
    ) ||
    !s.customFoods.every(
      (f) =>
        typeof f.id === "string" &&
        typeof f.name === "string" &&
        typeof f.emoji === "string" &&
        nutrients(f.per100),
    ) ||
    !finite(s.settings.calorieGoal) ||
    typeof s.settings.onboarded !== "boolean" ||
    typeof s.settings.exclusions !== "string" ||
    !finite(s.settings.maxMinutes)
  )
    throw new Error("Файл содержит некорректные значения");
  if (s.profile !== undefined) validateProfile(s.profile);
  return s;
}
export class LocalRepository implements StateRepository {
  constructor(
    private storage: Storage,
    private key: string,
  ) {}
  load() {
    const raw = this.storage.getItem(this.key);
    return raw ? parseState(JSON.parse(raw)) : emptyState();
  }
  save(state: AppState) {
    this.storage.setItem(this.key, JSON.stringify(state));
  }
}
