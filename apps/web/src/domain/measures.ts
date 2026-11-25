import type { Food } from "./model";
import { foodMeasures, type Measure } from "../../../../shared/foodMeasures";
export { foodMeasures, type Measure } from "../../../../shared/foodMeasures";
export function defaultMeasure(food: Food | undefined, grams: number) {
  const measures = foodMeasures(food);
  const piece = measures.find((m) => m.id === "piece");
  if (piece) return piece;
  if (measures.some((m) => m.id === "ml" && m.approximate))
    return (
      measures.find((m) => m.id === (grams < 14 ? "tsp" : "tbsp")) ??
      measures[0]
    );
  return measures[0];
}
export function kitchenAmount(grams: number, measure: Measure) {
  const value = grams / measure.grams;
  if (!measure.approximate || measure.id === "ml")
    return `${value < 1 ? value.toLocaleString("ru", { maximumFractionDigits: 2 }) : Math.round(value)} ${measure.label}`;
  const rounded =
    value < 1 ? Math.round(value * 4) / 4 : Math.round(value * 2) / 2;
  const whole = Math.floor(rounded),
    fraction = rounded - whole;
  const symbol =
    fraction === 0.25
      ? "¼"
      : fraction === 0.5
        ? "½"
        : fraction === 0.75
          ? "¾"
          : "";
  const amount = rounded === 0 ? "меньше ¼" : `${whole || ""}${symbol}`;
  const adjective = measure.size
    ? measure.size === "small"
      ? rounded < 1
        ? "небольшого"
        : rounded === 1
          ? "небольшой"
          : "небольших"
      : rounded < 1
        ? "среднего"
        : rounded === 1
          ? "средний"
          : "средних"
    : measure.label;
  return `${amount} ${adjective}`;
}
export function toGrams(amount: number, measure: Measure) {
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Укажи положительное количество.");
  return amount * measure.grams;
}
