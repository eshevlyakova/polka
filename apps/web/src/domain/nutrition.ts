import type { Food, Ingredient, Nutrients } from "./model";
export const zero = (): Nutrients => ({
  kcal: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
});
export function scale(n: Nutrients, factor: number): Nutrients {
  if (!Number.isFinite(factor) || factor < 0)
    throw new Error("Неверное количество");
  return {
    kcal: n.kcal * factor,
    protein: n.protein * factor,
    fat: n.fat * factor,
    carbs: n.carbs * factor,
  };
}
export function sum(values: Nutrients[]): Nutrients {
  return values.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      protein: a.protein + b.protein,
      fat: a.fat + b.fat,
      carbs: a.carbs + b.carbs,
    }),
    zero(),
  );
}
export function calculate(
  ingredients: Ingredient[],
  catalog: Food[],
): Nutrients {
  return sum(
    ingredients.map((i) => {
      const food = catalog.find((f) => f.id === i.foodId);
      if (!food) throw new Error("Продукт отсутствует в базе");
      return scale(food.per100, i.grams / 100);
    }),
  );
}
