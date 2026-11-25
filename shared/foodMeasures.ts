import type { Food } from "./model";
export type Measure = {
  id: string;
  label: string;
  grams: number;
  approximate: boolean;
  size?: "small" | "medium";
};
const gram: Measure = { id: "g", label: "г", grams: 1, approximate: false };
/** Household estimates; not a universal grams-per-spoon conversion. See MEASUREMENTS.md. */
export function foodMeasures(food?: Pick<Food, "id" | "name">): Measure[] {
  if (!food) return [gram];
  const n = food.name.toLocaleLowerCase("ru");
  if (!/консерв|маринов|суш[её]н|сок|паста|пюре|соус|заморож/.test(n)) {
    const vegetable = /огур/.test(n)
      ? {
          grams: /длинноплод/.test(n) ? 300 : 100,
          size: /длинноплод/.test(n) ? ("medium" as const) : ("small" as const),
        }
      : /помидор|томат/.test(n)
        ? {
            grams: /черри/.test(n) ? 15 : 150,
            size: /черри/.test(n) ? ("small" as const) : ("medium" as const),
          }
        : /морков/.test(n)
          ? { grams: 80, size: "medium" as const }
          : /картоф|лук репчат|перец слад|перец болгар/.test(n)
            ? { grams: 150, size: "medium" as const }
            : null;
    if (vegetable)
      return [
        gram,
        { id: "piece", label: "шт.", approximate: true, ...vegetable },
      ];
  }
  if ((food.id === "milk" || /молок[оа]/.test(n)) && !/сух|сгущ|порош|шоколад/.test(n))
    return [gram, { id: "ml", label: "мл", grams: 1.03, approximate: true }];
  if (food.id === "oil" || /масло.*(?:растит|оливк|подсол)/.test(n))
    return [
      gram,
      { id: "tbsp", label: "ст. л.", grams: 14, approximate: true },
      { id: "tsp", label: "ч. л.", grams: 14 / 3, approximate: true },
      { id: "ml", label: "мл", grams: 14 / 15, approximate: true },
    ];
  if (food.id === "egg" || /яйц|яиц/.test(n))
    return [gram, { id: "piece", label: "шт.", grams: 50, approximate: true }];
  if (food.id === "banana" || /банан/.test(n))
    return [gram, { id: "piece", label: "шт.", grams: 126, approximate: true }];
  if (food.id === "oats" || /овсян|хлопья овся/.test(n))
    return [
      gram,
      { id: "cup", label: "стак. 240 мл", grams: 113, approximate: true },
      { id: "tbsp", label: "ст. л.", grams: 113 / 16, approximate: true },
    ];
  if (food.id === "rice" || /рис.*сух/.test(n))
    return [
      gram,
      { id: "cup", label: "стак. 240 мл", grams: 198, approximate: true },
    ];
  return [gram];
}
