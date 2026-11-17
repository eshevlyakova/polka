import recipeData from "../../data/recipes.json";
import productData from "../../data/products.openfoodfacts.json";
import type { CatalogRecipe, CatalogProduct } from "./types";
export const catalogRecipes: CatalogRecipe[] = recipeData;
export const catalogProducts: CatalogProduct[] = productData;
const normalize = (value: string) =>
  value.toLocaleLowerCase("ru").replace(/ё/g, "е");
// Search aliases only; original ingredient quantities and source text are unchanged.
const aliases: [RegExp, string[]][] = [
  [/яйц|яиц/, ["egg"]],
  [/молок/, ["milk"]],
  [/творог/, ["quark", "cottage"]],
  [/куриц|курин/, ["chicken"]],
  [/говядин/, ["beef"]],
  [/свинин/, ["pork"]],
  [/рыб|лосос|форел/, ["fish", "salmon", "trout"]],
  [/рис/, ["rice"]],
  [/греч/, ["buckwheat"]],
  [/томат|помидор/, ["tomato"]],
  [/карто/, ["potato"]],
  [/макарон|паст[аы]/, ["pasta", "spaghetti", "macaroni"]],
  [/сыр/, ["cheese", "feta", "parmesan"]],
  [/(?:^|\s)огур/, ["cucumber"]],
  [/банан/, ["banana"]],
  [/яблок/, ["apple"]],
  [/овся|хлопь/, ["oat"]],
  [/гриб|шампиньон/, ["mushroom"]],
  [/йогурт/, ["yogurt"]],
  [/морков/, ["carrot"]],
  [/лук/, ["onion", "leek"]],
  [/капуст/, ["cabbage"]],
  [/кабач/, ["zucchini"]],
  [/баклажан/, ["eggplant", "aubergine"]],
  [/шпинат/, ["spinach"]],
  [/брокколи/, ["broccoli"]],
  [/чечевиц/, ["lentil"]],
  [/фасол/, ["bean"]],
  [/нут/, ["chickpea"]],
  [/масло/, ["oil", "butter"]],
  [/чеснок/, ["garlic"]],
  [/сливк/, ["cream"]],
  [/хлеб/, ["bread"]],
  [/мук/, ["flour"]],
];
function searchTokens(value: string) {
  const n = normalize(value);
  return [
    ...n
      .split(/[^\p{L}]+/u)
      .filter((w) => w.length > 3)
      .map((w) => w.slice(0, 5)),
    ...aliases
      .filter(([pattern]) => pattern.test(n))
      .flatMap(([, words]) => words),
  ];
}

/** Exact names/codes first; does not silently substitute a similar branded product. */
export function searchProducts(query: string, limit = 20) {
  const q = normalize(query.trim());
  if (!q) return [];
  const words = q.split(/\s+/);
  return catalogProducts
    .filter(
      (p) =>
        p.barcode === q ||
        words.every((w) => normalize(`${p.name} ${p.brand}`).includes(w)),
    )
    .sort(
      (a, b) =>
        Number(b.barcode === q) - Number(a.barcode === q) ||
        a.name.localeCompare(b.name, "ru"),
    )
    .slice(0, limit);
}
export function searchRecipes(query: string, limit = 20) {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return catalogRecipes
    .filter((r) =>
      words.every((w) =>
        normalize(
          `${r.nameRu ?? ""} ${r.name} ${r.ingredientsText.join(" ")}`,
        ).includes(w),
      ),
    )
    .slice(0, limit);
}

/** Small reference context, not a second catalogue copied into every model request. */
export function recipeReferences(
  names: string[],
  preferences: string,
  exclusions: string,
) {
  const tokens = searchTokens([...names, preferences].join(" "));
  const blocked = exclusions.split(",").flatMap(searchTokens);
  return catalogRecipes
    .map((recipe) => {
      const body = normalize(
        `${recipe.nameRu ?? ""} ${recipe.name} ${recipe.ingredientsText.join(" ")}`,
      );
      return {
        recipe,
        score: tokens.filter((w) => body.includes(w)).length,
        blocked: blocked.some((w) => body.includes(w)),
      };
    })
    .filter((r) => r.score > 0 && !r.blocked)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(
      ({ recipe: { id, name, nameRu, ingredientsText, steps, source } }) => ({
        id,
        name: nameRu ?? name,
        ingredientsText,
        steps,
        sourceUrl: source.url,
      }),
    );
}
