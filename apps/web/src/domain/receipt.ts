import {
  nutritionCandidates,
  nutritionName,
  validNutrition,
} from "../../../../shared/nutritionMatching";
import { basicFoods } from "../../../../shared/basicFoods";
import type { AppState, Food, Nutrients } from "./model";
import type { ReceiptItem } from "../../../../shared/receipt";
export type ReceiptDraft = {
  id: string;
  name: string;
  selected: boolean;
  grams: string;
  foodId: string;
  options: Food[];
  source: "generic" | "label" | "custom" | "saved";
  unitConfirmed: boolean;
  nutrition: Record<keyof Nutrients, string>;
  recognized: ReceiptItem;
};
export function receiptDrafts(
  items: ReceiptItem[],
  catalog: Food[],
): ReceiptDraft[] {
  return items.map((item) => {
    const exact = catalog.filter(
      (f) =>
        nutritionName(f.name) === nutritionName(item.name) &&
        validNutrition(f.per100),
    );
    const saved =
      exact.length === 1
        ? {
            food: exact[0],
            kind: basicFoods.some((f) => f.id === exact[0].id)
              ? ("generic" as const)
              : ("saved" as const),
            confidence: "exact" as const,
          }
        : undefined;
    const candidates = [
      ...new Map(
        [
          ...item.candidates.filter(
            (c) => c.food && validNutrition(c.food.per100),
          ),
          ...nutritionCandidates(item.name, [], catalog).filter(
            (c) => !item.candidates.some((i) => i.food.id === c.food.id),
          ),
          ...(saved ? [saved] : []),
        ].map((c) => [c.food.id, c]),
      ).values(),
    ];
    const recommended =
      saved ??
      candidates.find((c) => c.kind === "label" && c.confidence === "exact") ??
      candidates.find((c) => c.kind === "generic");
    const recognized = { ...item, candidates };
    const options = [
      ...new Map(
        [...candidates.map((c) => c.food), ...catalog]
          .filter((f) => validNutrition(f.per100))
          .map((f) => [f.id, f]),
      ).values(),
    ];
    return {
      id: item.id,
      name: item.name,
      selected: true,
      grams: item.grams === null ? "" : String(item.grams),
      foodId: recommended?.food.id ?? "",
      options,
      source: recommended?.kind ?? "custom",
      unitConfirmed: false,
      nutrition: { kcal: "", protein: "", fat: "", carbs: "" },
      recognized,
    };
  });
}
export function importReceipt(
  state: AppState,
  drafts: ReceiptDraft[],
  catalog: Food[],
  makeId = () => crypto.randomUUID(),
  now = new Date().toISOString(),
): AppState {
  const selected = drafts.filter((r) => r.selected);
  if (!selected.length) throw new Error("Выбери хотя бы один продукт.");
  const customFoods = [...state.customFoods];
  const pantry = [...state.pantry];
  for (const row of selected) {
    const grams = Number(row.grams.replace(",", "."));
    if (!row.name.trim() || row.name.length > 160)
      throw new Error("Проверь названия продуктов.");
    if (
      !row.grams.trim() ||
      !Number.isFinite(grams) ||
      grams < 0.1 ||
      grams > 100_000
    )
      throw new Error(`${row.name}: укажи массу от 0,1 до 100 000 г.`);
    let food: Food | undefined;
    if (row.foodId === "custom") {
      const per100 = Object.fromEntries(
        (["kcal", "protein", "fat", "carbs"] as const).map((k) => [
          k,
          Number(row.nutrition[k]?.replace(",", ".")),
        ]),
      ) as Nutrients;
      if (
        (["kcal", "protein", "fat", "carbs"] as const).some(
          (k) =>
            typeof row.nutrition[k] !== "string" || !row.nutrition[k].trim(),
        ) ||
        Object.entries(per100).some(
          ([k, n]) =>
            !Number.isFinite(n) || n < 0 || n > (k === "kcal" ? 950 : 100),
        ) ||
        per100.protein + per100.fat + per100.carbs > 105
      )
        throw new Error(
          `${row.name}: проверь КБЖУ на 100 г или выбери продукт из каталога.`,
        );
      food = { id: makeId(), name: row.name.trim(), emoji: "", per100 };
    } else {
      food = row.options.find((f) => f.id === row.foodId);
      if (!food)
        throw new Error(`${row.name}: выбери продукт для расчёта КБЖУ.`);
      if (!validNutrition(food.per100))
        throw new Error(
          `${row.name}: в базе неполные КБЖУ. Выбери другой продукт или введи значения с упаковки.`,
        );
      const candidate = row.recognized.candidates.find(
        (c) => c.food.id === food!.id,
      );
      if (candidate?.needsUnitConfirmation && !row.unitConfirmed)
        throw new Error(
          `${row.name}: подтверди, что КБЖУ на упаковке указаны на 100 г.`,
        );
    }
    if (
      !catalog.some((f) => f.id === food.id) &&
      !customFoods.some((f) => f.id === food.id)
    )
      customFoods.push(food);
    pantry.push({
      id: makeId(),
      foodId: food.id,
      grams,
      expiresOn: "",
      addedAt: now,
      label: row.name.trim(),
    });
  }
  return { ...state, pantry, customFoods };
}
