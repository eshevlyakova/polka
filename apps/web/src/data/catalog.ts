import type { Food, Recipe } from "../domain/model";
// Illustrative generic values per 100 g. Users can add exact label values.
export const foods: Food[] = [
  ["egg", "Яйцо", "🥚", 157, 12.7, 11.5, 0.7],
  ["tomato", "Помидоры", "🍅", 20, 1.1, 0.2, 3.7],
  ["oil", "Масло растительное", "🫒", 899, 0, 99.9, 0],
  ["chicken", "Куриная грудка, сырая", "🍗", 120, 22.5, 2.6, 0],
  ["rice", "Рис, сухой", "🍚", 360, 7, 1, 79],
  ["cottage", "Творог 5%", "🥣", 121, 17, 5, 1.8],
  ["cucumber", "Огурцы", "🥒", 15, 0.8, 0.1, 2.8],
  ["oats", "Овсяные хлопья", "🌾", 370, 13, 7, 62],
  ["banana", "Банан", "🍌", 89, 1.1, 0.3, 23],
  ["milk", "Молоко 2,5%", "🥛", 52, 2.8, 2.5, 4.7],
  ["cheese", "Сыр", "🧀", 350, 25, 27, 0],
  ["pasta", "Макароны, сухие", "🍝", 350, 12, 1.5, 72],
  ["yogurt", "Йогурт натуральный", "🥛", 60, 4, 3, 5],
].map(([id, name, emoji, kcal, protein, fat, carbs]) => ({
  id: String(id),
  name: String(name),
  emoji: String(emoji),
  per100: {
    kcal: Number(kcal),
    protein: Number(protein),
    fat: Number(fat),
    carbs: Number(carbs),
  },
}));
export const recipes: Recipe[] = [
  {
    id: "omelet",
    name: "Омлет с томатами",
    emoji: "🍳",
    minutes: 15,
    servings: 2,
    equipment: "Сковорода",
    ingredients: [
      { foodId: "egg", grams: 200 },
      { foodId: "tomato", grams: 200 },
      { foodId: "oil", grams: 10 },
    ],
    steps: [
      "Нарежь помидоры. Разбей яйца и перемешай.",
      "Разогрей масло, добавь помидоры, затем яйца.",
      "Готовь под крышкой до полной готовности яиц.",
    ],
  },
  {
    id: "chicken-rice",
    name: "Курица с рисом",
    emoji: "🍗",
    minutes: 30,
    servings: 3,
    equipment: "Плита",
    ingredients: [
      { foodId: "chicken", grams: 450 },
      { foodId: "rice", grams: 180 },
      { foodId: "oil", grams: 15 },
      { foodId: "cucumber", grams: 200 },
    ],
    steps: [
      "Отвари рис по инструкции на упаковке.",
      "Нарежь курицу и приготовь на масле до полной готовности.",
      "Подай с рисом и огурцами.",
    ],
  },
  {
    id: "cottage-banana",
    name: "Творог с бананом",
    emoji: "🥣",
    minutes: 5,
    servings: 1,
    equipment: "Без плиты",
    ingredients: [
      { foodId: "cottage", grams: 200 },
      { foodId: "banana", grams: 100 },
    ],
    steps: ["Нарежь банан.", "Добавь к творогу и перемешай."],
  },
  {
    id: "porridge",
    name: "Овсянка с бананом",
    emoji: "🥣",
    minutes: 10,
    servings: 1,
    equipment: "Плита",
    ingredients: [
      { foodId: "oats", grams: 50 },
      { foodId: "milk", grams: 200 },
      { foodId: "banana", grams: 100 },
    ],
    steps: [
      "Свари хлопья на молоке по инструкции на упаковке.",
      "Добавь нарезанный банан.",
    ],
  },
];
