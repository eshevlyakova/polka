export const foodArtKinds = [
  "egg",
  "tomato",
  "oil",
  "chicken",
  "rice",
  "cottage",
  "cucumber",
  "oats",
  "banana",
  "milk",
  "cheese",
  "pasta",
  "yogurt",
  "apple",
  "bread",
  "carrot",
  "fish",
  "greens",
  "potato",
  "mushroom",
  "berries",
  "lemon",
  "beans",
  "jar",
] as const;
export type FoodArtKind = (typeof foodArtKinds)[number];
export function foodArtKind(foodId: string, name = ""): FoodArtKind {
  if ((foodArtKinds as readonly string[]).includes(foodId))
    return foodId as FoodArtKind;
  const n = name.toLocaleLowerCase("ru");
  const matches: [RegExp, FoodArtKind][] = [
    [/яйц|яиц/, "egg"],
    [/томат|помидор/, "tomato"],
    [/масло.*(?:растит|олив|подсол)/, "oil"],
    [/куриц|курин|индей/, "chicken"],
    [/творог|творож/, "cottage"],
    [/йогурт|сметан|кефир/, "yogurt"],
    [/молоко|сливки/, "milk"],
    [/сыр/, "cheese"],
    [/огур/, "cucumber"],
    [/банан/, "banana"],
    [/овсян|хлопь|гранол/, "oats"],
    [/рис|греч|круп/, "rice"],
    [/макарон|паст[аы]|спагетти/, "pasta"],
    [/яблок|груш/, "apple"],
    [/хлеб|батон|булоч|тост/, "bread"],
    [/морков/, "carrot"],
    [/рыб|лосос|форел|треск|тунец|сёмг|семг/, "fish"],
    [/зелень|шпинат|салат|укроп|петруш|руккол/, "greens"],
    [/карто/, "potato"],
    [/гриб|шампиньон/, "mushroom"],
    [/ягод|клубник|малин|черник|голубик/, "berries"],
    [/лимон|лайм|апельсин/, "lemon"],
    [/фасол|боб|нут|чечевиц/, "beans"],
  ];
  return matches.find(([pattern]) => pattern.test(n))?.[1] ?? "jar";
}
