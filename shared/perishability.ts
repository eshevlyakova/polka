/** Recommendation hints, never expiry dates or a statement that food is safe. */
export type Perishability = {
  category:
    | "fresh-dairy"
    | "meat-fish"
    | "greens"
    | "fruit-vegetables"
    | "eggs"
    | "shelf-stable"
    | "unknown";
  priority: number;
  typicalDays: number | null;
};
export function classifyPerishability(name: string): Perishability {
  const n = name.toLocaleLowerCase("ru");
  // Preserved/frozen food must not inherit the priority of its fresh equivalent.
  if (
    /заморож|суш[её]н|консерв|сухое молоко|ультрапастер|(?:^|\s)сок(?:\s|$)|варенье|джем|пюре.*пауч|сгущ[её]н|печенье|конфет|чипсы|шоколадная паста/.test(
      n,
    )
  )
    return { category: "shelf-stable", priority: 0, typicalDays: null };
  if (/творо[гж]|молоко|кефир|йогурт|сметан|ряженк|сливки/.test(n))
    return { category: "fresh-dairy", priority: 3, typicalDays: 4 };
  if (
    /куриц|курин|индей|говядин|свинин|фарш|рыба|лосос|форел|треск|филе|кревет/.test(
      n,
    )
  )
    return { category: "meat-fish", priority: 3, typicalDays: 2 };
  if (/зелень|салат.*лист|шпинат|укроп|петруш|руккол|кинза/.test(n))
    return { category: "greens", priority: 3, typicalDays: 3 };
  if (
    /помидор|томат|огур|банан|яблок|груш|персик|ягод|клубник|малин|кабач|баклажан|брокколи|капуст|гриб|шампиньон|авокадо|фрукт|овощ/.test(
      n,
    )
  )
    return { category: "fruit-vegetables", priority: 2, typicalDays: 7 };
  if (/яйц|яиц/.test(n))
    return { category: "eggs", priority: 1, typicalDays: 21 };
  if (
    /рис|греч|макарон|паст[аы]|хлопь|овсян|масло раст|мука|сахар|соль|круп/.test(
      n,
    )
  )
    return { category: "shelf-stable", priority: 0, typicalDays: null };
  return { category: "unknown", priority: 0, typicalDays: null };
}

export function perishableScore(
  ingredients: { foodId: string; grams: number }[],
  products: { foodId: string; name: string; grams: number; addedAt?: string }[],
  aiPerishableIds: ReadonlySet<string> = new Set(),
  now = Date.now(),
) {
  const ids = new Set(
    ingredients.filter((i) => i.grams > 0).map((i) => i.foodId),
  );
  const seen = new Set<string>();
  return products
    .filter((p) => p.grams > 0 && ids.has(p.foodId))
    .reduce((score, p) => {
      if (seen.has(p.foodId)) return score;
      seen.add(p.foodId);
      const hint = classifyPerishability(p.name);
      const priority =
        hint.category === "unknown" && aiPerishableIds.has(p.foodId)
          ? 2
          : hint.priority;
      const oldest = products
        .filter(
          (lot) =>
            lot.foodId === p.foodId &&
            lot.grams > 0 &&
            lot.addedAt &&
            Number.isFinite(Date.parse(lot.addedAt)),
        )
        .map((lot) => Date.parse(lot.addedAt!))
        .sort((a, b) => a - b)[0];
      const age =
        oldest === undefined ? 0 : Math.max(0, (now - oldest) / 86400000);
      const bonus = hint.typicalDays
        ? priority * Math.min(2, age / hint.typicalDays)
        : 0;
      return score + priority + bonus;
    }, 0);
}
