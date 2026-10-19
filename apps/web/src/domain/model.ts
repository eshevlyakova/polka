export type Nutrients = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};
export type Food = {
  id: string;
  name: string;
  emoji: string;
  per100: Nutrients;
};
export type PantryItem = {
  id: string;
  foodId: string;
  grams: number;
  expiresOn: string;
};
export type Ingredient = { foodId: string; grams: number };
export type Recipe = {
  id: string;
  name: string;
  emoji: string;
  minutes: number;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  equipment: string;
};
export type Batch = {
  id: string;
  recipeName: string;
  cookedAt: string;
  nutrients: Nutrients;
  remainingFraction: number;
  servings: number;
};
export type DiaryEntry = {
  pantryUsed?: PantryItem[];
  eatenAt?: string;
  note?: string;
  source?: string;
  id: string;
  name: string;
  date: string;
  meal: string;
  nutrients: Nutrients;
  amountLabel: string;
  approximate: boolean;
  batchId?: string;
  fraction?: number;
};
export type Settings = {
  onboarded: boolean;
  calorieGoal: number;
  exclusions: string;
  maxMinutes: number;
};
export type WeightEntry = { date: string; kg: number };
export type UserProfile = {
  demo?: boolean;
  weightHistory?: WeightEntry[];
  name: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
};
export type AppState = {
  profile?: UserProfile;
  version: 1;
  pantry: PantryItem[];
  batches: Batch[];
  diary: DiaryEntry[];
  customFoods: Food[];
  settings: Settings;
};
export const emptyState = (): AppState => ({
  version: 1,
  pantry: [],
  batches: [],
  diary: [],
  customFoods: [],
  settings: {
    onboarded: false,
    calorieGoal: 1800,
    exclusions: "",
    maxMinutes: 30,
  },
});
export const localDate = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
