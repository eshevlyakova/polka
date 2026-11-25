import type { Food } from "./model";
import type { ReceiptCandidate } from "./receipt";
export type NutritionProduct = {
  id: string;
  name: string;
  brand: string;
  barcode: string;
  barcodes?: string[];
  quantityLabel: string;
  per100: Food["per100"];
  basis: string;
  categories: string[];
  source: { url: string };
};
export function validNutrition(value: unknown): value is Food["per100"] {
  if (!value || typeof value !== "object") return false;
  const n = value as Record<string, unknown>;
  return (
    ["kcal", "protein", "fat", "carbs"].every(
      (k) =>
        typeof n[k] === "number" &&
        Number.isFinite(n[k]) &&
        (n[k] as number) >= 0 &&
        (n[k] as number) <= (k === "kcal" ? 950 : 100),
    ) && Number(n.protein) + Number(n.fat) + Number(n.carbs) <= 105
  );
}
function solidPer100g(product: NutritionProduct) {
  if (product.basis === "per100g") return true;
  const name = nutritionName(product.name);
  if (/напиток|питьев|жидк|сок|суп|смесь|соус|молоко|кефир|йогурт/.test(name))
    return false;
  return product.categories.some((c) =>
    /^(?:en:)?(?:cheeses|quarks|cottage-cheeses|pastas|chocolates|biscuits|breads|rice|fresh-fruits|fresh-vegetables|breakfast-cereals)$/.test(
      c,
    ),
  );
}
export function nutritionName(value: string) {
  return value
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/(\d)[,.](\d)/g, "$1.$2")
    .replace(
      /\b\d+(?:\.\d+)?\s*(?:кг|гр\.?|г|мл|л|шт\.?|уп\.?)(?=$|\s|[,;)])/gu,
      " ",
    )
    .replace(/[^\p{L}\p{N}%.]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
const brands: Record<string, string> = {
  danone: "данон",
  activia: "активиа",
  savushkin: "савушкин",
  prostokvashino: "простоквашино",
  epica: "эпика",
  miratorg: "мираторг",
  vkusnoteevo: "вкуснотеево",
  valio: "валио",
};
function tokens(s: string) {
  return nutritionName(s)
    .split(/[^\p{L}]+/u)
    .filter(
      (t) =>
        t.length >= 3 &&
        !/^(?:грамм|упаков|штук|продукт|пастеризован|паст|ультрапастеризован)/.test(
          t,
        ),
    )
    .map((t) => brands[t] ?? t)
    .map((t) =>
      t.length > 4
        ? t.replace(
            /(?:ами|ями|ого|ые|ый|ий|ая|ое|ов|ев|а|я|ы|и|о|е|у|ю)$/u,
            "",
          )
        : t,
    );
}
function fat(s: string) {
  const m = nutritionName(s).match(/(\d+(?:\.\d+)?)\s*%/u);
  return m ? Number(m[1]) : null;
}
function same(a: string, b: string) {
  return (
    a === b ||
    (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)))
  );
}
const genericRules: [string, RegExp][] = [
  ["egg", /(?:^|\s)яйц|яиц/u],
  ["tomato", /помидор|томат(?:ы|\s|$)/u],
  ["oil", /масло.*(?:подсолнеч|оливк|растит)|растит.*масло/u],
  ["chicken", /(?:курин|куриц).*(?:груд|филе)/u],
  ["rice", /(?:^|\s)рис(?:\s|$)/u],
  ["cucumber", /(?:^|\s)огур/u],
  ["oats", /овсян|хлопья овся/u],
  ["banana", /банан/u],
  ["pasta", /макарон|спагетти/u],
  ["cottage", /творог(?:\s|$)/u],
  ["milk", /молоко(?:\s|$)/u],
  ["cheese", /(?:^|\s)сыр(?:\s|$)/u],
  ["yogurt", /йогурт/u],
  ["apple", /яблок/u],
  ["avocado", /авокадо/u],
  ["cantaloupe", /канталуп|дын/u],
  ["grapefruit", /грейпфрут/u],
  ["grapes", /виноград/u],
  ["kiwi", /киви/u],
  ["lemon", /лимон/u],
  ["lime", /лайм/u],
  ["nectarine", /нектарин/u],
  ["orange", /апельсин/u],
  ["peach", /персик/u],
  ["pear", /груш/u],
  ["pineapple", /ананас/u],
  ["plum", /слив(?:а|ы|\s)/u],
  ["strawberry", /клубник/u],
  ["cherry", /черешн/u],
  ["tangerine", /мандарин/u],
  ["watermelon", /арбуз/u],
  ["asparagus", /спарж/u],
  ["bell-pepper", /перец.*(?:слад|болгар)|(?:слад|болгар).*перец/u],
  ["broccoli", /брокколи/u],
  ["carrot", /морков/u],
  ["cauliflower", /капуст.*цветн|цветн.*капуст/u],
  ["celery", /сельдер/u],
  ["green-beans", /фасол.*стручк|стручк.*фасол/u],
  ["cabbage", /капуст.*белокоч|белокоч.*капуст/u],
  ["green-onion", /лук.*зелен|зелен.*лук/u],
  ["iceberg", /айсберг/u],
  ["leaf-lettuce", /салат.*лист|лист.*салат|латук/u],
  ["mushroom", /шампиньон/u],
  ["onion", /лук.*репчат|репчат.*лук/u],
  ["potato", /картоф/u],
  ["radish", /редис/u],
  ["zucchini", /кабач/u],
  ["corn", /кукуруз/u],
  ["sweet-potato", /батат/u],
];
function generic(name: string, foods: Food[]): ReceiptCandidate | undefined {
  const n = nutritionName(name);
  if (
    /готов|отвар|обжар|запеч|квашен|солен|сок|варенье|джем|пюре|сушен|цукат|сироп|заморож|консерв|маринов|копчен|жарен|варен|сгущ|сухое молоко|сырок|творожн|десерт|пудинг|глазир|напиток|молоко.*(?:кокос|овсян|соев|миндал)|(?:кокос|овсян|соев|миндал).*молоко/.test(
      n,
    )
  )
    return;
  const id = genericRules.find(([, rule]) => rule.test(n))?.[0];
  const food = foods.find((f) => f.id === id);
  if (!food) return;
  const statedFat = fat(n),
    baselineFat = fat(food.name);
  if (
    statedFat !== null &&
    baselineFat !== null &&
    Math.abs(statedFat - baselineFat) > 0.05
  )
    return;
  if (id === "yogurt" && !/натурал|без наполн|греческ/.test(n)) return;
  if (
    (id === "yogurt" || id === "cottage") &&
    /клубни|малин|черник|череш|банан|персик|шокол|карамел|ванил|вишн|фрукт|ягод|злак/.test(
      n,
    )
  )
    return;
  return { food, kind: "generic", confidence: "generic" };
}
export function nutritionCandidates(
  name: string,
  products: NutritionProduct[],
  foods: Food[],
): ReceiptCandidate[] {
  const q = nutritionName(name),
    terms = tokens(q),
    requestedFat = fat(q);
  const ranked = products
    .map((p) => {
      const body = tokens(p.name + " " + p.brand),
        productFat = fat(p.name);
      const matches = terms.filter((t) => body.some((w) => same(t, w))).length;
      const coverage = terms.length ? matches / terms.length : 0;
      const barcode = [p.barcode, ...(p.barcodes ?? [])].some((code) => code && q.includes(code));
      const brandTerms = tokens(p.brand);
      const brand =
        brandTerms.length > 0 &&
        brandTerms.every((t) => terms.some((w) => same(t, w)));
      const exact =
        nutritionName(p.name + " " + p.brand) === q ||
        nutritionName(p.name) === q;
      const compatible =
        requestedFat === null ||
        productFat === null ||
        Math.abs(requestedFat - productFat) < 0.05;
      return {
        p,
        coverage,
        score:
          (barcode ? 10 : 0) + (exact ? 2 : 0) + coverage + (brand ? 0.25 : 0),
        strong:
          barcode ||
          (coverage === 1 &&
            (brand || exact) &&
            (requestedFat === null || productFat !== null)),
        valid: compatible && (barcode || (matches > 0 && coverage >= 0.5)),
      };
    })
    .filter((r) => r.valid)
    .sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id))
    .slice(0, 3);
  const unique =
    ranked[0]?.strong &&
    (!ranked[1] || ranked[0].score - ranked[1].score > 0.15);
  const candidates: ReceiptCandidate[] = ranked.map(({ p }, index) => ({
    food: {
      id: p.id,
      name: [p.name, p.brand].filter(Boolean).join(" · "),
      emoji: "",
      per100: p.per100,
    },
    kind: "label",
    confidence: unique && index === 0 ? "exact" : "suggestion",
    sourceUrl: p.source.url,
    needsUnitConfirmation: !solidPer100g(p),
  }));
  const fallback = generic(name, foods);
  if (fallback) candidates.push(fallback);
  return candidates;
}
