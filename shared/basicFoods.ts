import type { Food } from "./model";
import produce from "./data/produce-fda.json";
// Illustrative generic values per 100 g. Users can add exact label values.
const originalFoods: Food[] = [
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
export const basicFoods: Food[] = [
  ...originalFoods,
  ...produce.map(({ id, name, emoji, per100 }) => ({
    id,
    name,
    emoji,
    per100,
  })),
];
