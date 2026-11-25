import type { Nutrients } from "./model";
import type { Food, PantryItem } from "./model";
export function libraryProducts(pantry: PantryItem[], catalog: Food[]) {
  const found = new Map<
    string,
    { foodId: string; name: string; grams: number; addedAt?: string }
  >();
  for (const lot of pantry) {
    if (lot.grams <= 0) continue;
    const name = catalog.find((f) => f.id === lot.foodId)?.name;
    if (!name) continue;
    const previous = found.get(lot.foodId);
    found.set(lot.foodId, {
      foodId: lot.foodId,
      name,
      grams: lot.grams + (previous?.grams ?? 0),
      addedAt: [previous?.addedAt, lot.addedAt]
        .filter((s): s is string => Boolean(s))
        .sort()[0],
    });
  }
  return [...found.values()].slice(0, 100);
}
export type RecipeOrigin = {
  label: string;
  url: string;
  license: string;
  licenseUrl: string;
};
export type LibraryIngredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
  note?: string | null;
  rawAmount?: string;
};
export type LibraryRecipe = {
  id: string;
  name: string;
  summary: string;
  country: string;
  category: string;
  diets: string[];
  servings: number | null;
  minutes: number | null;
  perServing: Nutrients | null;
  ingredients: LibraryIngredient[];
  steps: string[];
  origin: RecipeOrigin;
};
export type LibraryMetadata = Omit<LibraryRecipe, "steps">;
export type LibraryCard = LibraryMetadata & {
  stockMatches: number;
};
export type LibrarySearch = {
  excludedRecipeIds?: string[];
  query: string;
  maxMinutes: number;
  category: string;
  sort: "relevance" | "quick" | "calories";
  offset: number;
  limit: number;
  exclusions: string;
  requiredIngredients?: string[];
  products: { foodId: string; name: string; grams: number; addedAt?: string }[];
};
export type LibraryPage = {
  items: LibraryCard[];
  total: number;
  offset: number;
  limit: number;
  catalogTotal: number;
};
export const libraryCategories: Record<string, string> = {
  all: "Все блюда",
  breakfast: "Завтраки",
  main: "Основные блюда",
  soup: "Супы",
  salad: "Салаты",
  snack: "Закуски",
  dessert: "Десерты",
  bread: "Выпечка",
  side: "Гарниры",
  sauce: "Соусы",
  drink: "Напитки",
};
export const normalizeRecipeText = (s: string) =>
  s.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/яицом/gu, "яйцом");
/** Light lexical matching only; never claim arbitrary natural-language understanding. */
const wordCache = new Map<string, string[]>();
export function recipeWords(text: string) {
  const cached = wordCache.get(text);
  if (cached) return [...cached];
  const result = normalizeRecipeText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2 && !/^\d+$/.test(w))
    .map((w) =>
      w.length > 3
        ? w.replace(
            /(?:ами|ями|ого|его|ому|ему|ые|ие|ый|ий|ая|яя|ое|ее|ов|ев|ам|ям|ах|ях|а|я|ы|и|о|е|у|ю)$/u,
            "",
          )
        : w,
    )
    .map((w) => {
      if (/^(?:яйц|яиц)/u.test(w)) return "яйц";
      return w === "куриц" ? "курин" : w;
    });
  if (wordCache.size >= 20000) wordCache.delete(wordCache.keys().next().value!);
  wordCache.set(text, result);
  return [...result];
}
export function ingredientOnShelf(
  name: string,
  products: LibrarySearch["products"],
) {
  const words = recipeWords(name).filter(
    (w) => !["свеж", "сух", "молот", "для", "целиком"].includes(w),
  );
  return (
    words.length > 0 &&
    products.some(
      (p) =>
        p.grams > 0 &&
        words.every((w) =>
          recipeWords(p.name).some(
            (t) =>
              t === w ||
              (Math.min(t.length, w.length) >= 4 &&
                (t.startsWith(w) || w.startsWith(t))),
          ),
        ),
    )
  );
}
export function libraryQuantity(
  i: LibraryIngredient,
  servings: number,
  base: number | null,
) {
  if (i.quantity === null) return i.unit === "toTaste" ? "по вкусу" : i.rawAmount || "не указано";
  if (i.unit === "toTaste") return "по вкусу";
  if (base === null) return `${i.quantity.toLocaleString("ru")} ${({ g: "г", kg: "кг", ml: "мл", l: "л", piece: "шт.", tbsp: "ст. л.", tsp: "ч. л.", cup: "стак.", clove: "зубч.", pinch: "щеп.", bunch: "пуч." } as Record<string, string>)[i.unit] ?? i.unit}`;
  const n = (i.quantity * servings) / base;
  const household = [
    "piece",
    "tbsp",
    "tsp",
    "clove",
    "pinch",
    "sprig",
    "slice",
  ].includes(i.unit);
  const rounded = household
    ? n < 1
      ? Math.round(n * 4) / 4
      : Math.round(n * 2) / 2
    : n;
  const unit: Record<string, string> = {
    g: "г",
    kg: "кг",
    ml: "мл",
    l: "л",
    piece: "шт.",
    tbsp: "ст. л.",
    tsp: "ч. л.",
    clove: "зубч.",
    pinch: "щеп.",
    sprig: "веточки",
    slice: "ломтика",
    cup: "стак.",
    bunch: "пуч.",
  };
  const amount = household
    ? rounded === 0
      ? "менее ¼"
      : `${Math.floor(rounded) || ""}${({ 0.25: "¼", 0.5: "½", 0.75: "¾" } as Record<number, string>)[rounded % 1] ?? ""}`
    : n.toLocaleString("ru", { maximumFractionDigits: n < 1 ? 2 : 1 });
  return `${household && rounded > 0 && Math.abs(rounded - n) > 1e-6 ? "≈ " : ""}${amount} ${unit[i.unit] ?? i.unit}`;
}
