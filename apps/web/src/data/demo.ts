import { estimateWeight } from "../domain/cooking";
import {
  type AppState,
  type DiaryEntry,
  type Ingredient,
  localDate,
} from "../domain/model";
import { calculate, scale } from "../domain/nutrition";
import { createDemoProfile } from "./demoProfile";
import { foods, recipes } from "./catalog";
/** A fictional account, seeded once. Dates are relative to first launch, never refreshed over user edits. */
export function createDemoState(now = new Date()): AppState {
  const day = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return localDate(d);
  };
  const entry = (
    id: string,
    name: string,
    meal: string,
    offset: number,
    ingredients: Ingredient[],
    amountLabel: string,
  ): DiaryEntry => ({
    id,
    name,
    meal,
    date: day(offset),
    nutrients: calculate(ingredients, foods),
    amountLabel,
    approximate: true,
    eatenAt: (
      {
        Завтрак: "08:40",
        Обед: "13:15",
        Перекус: "16:10",
        Ужин: "19:30",
      } as Record<string, string>
    )[meal],
    source: "Домашняя еда",
  });
  const breakfast = [
    { foodId: "oats", grams: 55 },
    { foodId: "milk", grams: 180 },
    { foodId: "banana", grams: 100 },
  ];
  const lunch = [
    { foodId: "chicken", grams: 180 },
    { foodId: "rice", grams: 65 },
    { foodId: "oil", grams: 8 },
    { foodId: "cucumber", grams: 100 },
  ];
  const diary: DiaryEntry[] = [];
  for (let offset = -13; offset <= 0; offset++) {
    diary.push(
      entry(
        `demo-breakfast-${offset}`,
        offset % 3 === 0
          ? "Овсянка с бананом"
          : offset % 3 === -1
            ? "Омлет с помидорами"
            : "Творог и йогурт",
        "Завтрак",
        offset,
        offset % 3 === 0
          ? breakfast
          : offset % 3 === -1
            ? [
                { foodId: "egg", grams: 100 },
                { foodId: "tomato", grams: 120 },
                { foodId: "oil", grams: 5 },
                { foodId: "cheese", grams: 25 },
              ]
            : [
                { foodId: "cottage", grams: 180 },
                { foodId: "yogurt", grams: 80 },
                { foodId: "banana", grams: 100 },
              ],
        "1 тарелка · по составу",
      ),
    );
    diary.push(
      entry(
        `demo-lunch-${offset}`,
        offset >= -1 || offset % 2 === 0 ? "Курица с рисом" : "Паста с курицей",
        "Обед",
        offset,
        offset >= -1 || offset % 2 === 0
          ? lunch
          : [
              { foodId: "pasta", grams: 80 },
              { foodId: "chicken", grams: 140 },
              { foodId: "oil", grams: 8 },
              { foodId: "tomato", grams: 100 },
            ],
        "1 порция · по составу",
      ),
    );
    diary.push(
      entry(
        `demo-snack-${offset}`,
        offset === -3 ? "Латте и банан в кафе" : "Йогурт с бананом",
        "Перекус",
        offset,
        [
          { foodId: "yogurt", grams: 170 },
          { foodId: "banana", grams: 70 },
        ],
        "240 г",
      ),
    );
    if (offset < 0)
      diary.push(
        entry(
          `demo-dinner-${offset}`,
          "Творог с бананом",
          "Ужин",
          offset,
          [
            { foodId: "cottage", grams: 200 },
            { foodId: "banana", grams: 100 },
          ],
          "300 г",
        ),
      );
  }
  const cafe = diary.find((e) => e.id === "demo-snack--3");
  if (cafe) {
    cafe.source = "Кафе · оценка";
    cafe.nutrients = calculate(
      [
        { foodId: "milk", grams: 220 },
        { foodId: "banana", grams: 100 },
      ],
      foods,
    );
    cafe.amountLabel = "250 мл + 1 банан";
    cafe.note = "Выбрала похожую позицию: точного состава нет.";
  }
  const recipe = recipes.find((r) => r.id === "chicken-rice")!;
  // Two diary servings and the remaining third belong to one cooked batch.
  for (const record of diary) {
    if (record.id === "demo-lunch--1" || record.id === "demo-lunch-0") {
      record.batchId = "demo-cooked-chicken";
      record.fraction = 1 / 3;
      record.nutrients = scale(calculate(recipe.ingredients, foods), 1 / 3);
      record.amountLabel = "1 из 3 равных порций";
      record.approximate = false;
    }
  }
  return {
    profile: createDemoProfile(now),
    version: 1,
    settings: {
      onboarded: true,
      calorieGoal: 1800,
      exclusions: "",
      maxMinutes: 30,
    },
    customFoods: [],
    pantry: [
      { id: "demo-egg", foodId: "egg", grams: 500, expiresOn: "" },
      { id: "demo-cottage", foodId: "cottage", grams: 400, expiresOn: "" },
      { id: "demo-tomato", foodId: "tomato", grams: 500, expiresOn: "" },
      { id: "demo-chicken", foodId: "chicken", grams: 600, expiresOn: "" },
      {
        id: "demo-cucumber",
        foodId: "cucumber",
        grams: 300,
        expiresOn: "",
      },
      { id: "demo-rice", foodId: "rice", grams: 500, expiresOn: "" },
      { id: "demo-oil", foodId: "oil", grams: 200, expiresOn: "" },
      { id: "demo-banana", foodId: "banana", grams: 400, expiresOn: "" },
      { id: "demo-oats", foodId: "oats", grams: 350, expiresOn: "" },
      { id: "demo-milk", foodId: "milk", grams: 500, expiresOn: "" },
      { id: "demo-yogurt", foodId: "yogurt", grams: 340, expiresOn: "" },
    ].map((item, index) => ({
      ...item,
      addedAt: day(-(index % 4)) + "T12:00:00.000Z",
    })),
    batches: [
      {
        id: "demo-cooked-chicken",
        estimatedWeightGrams: estimateWeight(recipe),
        recipeName: "Курица с рисом",
        cookedAt: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          18,
        ).toISOString(),
        nutrients: calculate(recipe.ingredients, foods),
        remainingFraction: 1 / 3,
        servings: 3,
      },
      {
        id: "demo-cooked-omelet",
        estimatedWeightGrams: estimateWeight(
          recipes.find((r) => r.id === "omelet")!,
        ),
        recipeName: "Омлет с томатами",
        cookedAt: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          9,
        ).toISOString(),
        nutrients: calculate(
          recipes.find((r) => r.id === "omelet")!.ingredients,
          foods,
        ),
        remainingFraction: 1,
        servings: 2,
      },
      {
        id: "demo-cooked-cottage",
        estimatedWeightGrams: 600,
        recipeName: "Творог с бананом",
        cookedAt: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          10,
        ).toISOString(),
        nutrients: calculate(
          [
            { foodId: "cottage", grams: 400 },
            { foodId: "banana", grams: 200 },
          ],
          foods,
        ),
        remainingFraction: 1,
        servings: 2,
      },
    ],
    diary: diary.reverse(),
  };
}
