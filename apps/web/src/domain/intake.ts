import { eat } from "./actions";
import { localDate, type AppState, type Food, type PantryItem } from "./model";
import { scale } from "./nutrition";

export type IntakeSource = "pantry" | "prepared" | "other";
type Context = { meal: string; date: string };
export type Intake = Context &
  (
    | { source: "prepared"; batchId: string; fraction: number }
    | {
        source: "pantry" | "other";
        foodId: string;
        grams: number;
        approximate: boolean;
      }
  );
export function recordIntake(
  state: AppState,
  intake: Intake,
  catalog: Food[],
  id: string,
): AppState {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(intake.date) ||
    !Number.isFinite(Date.parse(intake.date)) ||
    new Date(intake.date).toISOString().slice(0, 10) !== intake.date ||
    !intake.meal.trim()
  )
    throw new Error("Укажи дату и приём пищи");
  if (intake.source === "prepared")
    return eat(
      state,
      intake.batchId,
      intake.fraction,
      intake.meal,
      id,
      intake.date,
    );
  const food = catalog.find((item) => item.id === intake.foodId);
  if (!food) throw new Error("Выбери продукт или блюдо");
  if (!Number.isFinite(intake.grams) || intake.grams <= 0)
    throw new Error("Укажи положительное количество в граммах");
  const pantryUsed: PantryItem[] = [];
  let pantry = state.pantry;
  if (intake.source === "pantry") {
    const lots = state.pantry
      .filter((item) => item.foodId === intake.foodId && item.grams > 0)
      .sort((a, b) =>
        (a.expiresOn || "9999").localeCompare(b.expiresOn || "9999"),
      );
    if (
      lots.reduce((total, item) => total + item.grams, 0) + 1e-6 <
      intake.grams
    )
      throw new Error(
        "На полке меньше продукта, чем ты указал. Уменьши количество или выбери «Другая еда».",
      );
    let remaining = intake.grams;
    for (const lot of lots) {
      const grams = Math.min(lot.grams, remaining);
      if (grams > 0) pantryUsed.push({ ...lot, grams });
      remaining -= grams;
    }
    pantry = state.pantry
      .map((item) => ({
        ...item,
        grams:
          item.grams -
          (pantryUsed.find((used) => used.id === item.id)?.grams ?? 0),
      }))
      .filter((item) => item.grams > 1e-6);
  }
  return {
    ...state,
    pantry,
    diary: [
      {
        id,
        name: food.name,
        meal: intake.meal,
        date: intake.date || localDate(),
        nutrients: scale(food.per100, intake.grams / 100),
        amountLabel: `${intake.grams.toLocaleString("ru")} г`,
        approximate: intake.approximate,
        source: intake.source === "pantry" ? "С полки" : "Другая еда",
        ...(pantryUsed.length ? { pantryUsed } : {}),
      },
      ...state.diary,
    ],
  };
}
