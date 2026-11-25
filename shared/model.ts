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
  /** Kept only to read/restore old local data; no longer a product requirement. */
  expiresOn: string;
  addedAt?: string;
  label?: string;
};
export type Ingredient = { foodId: string; grams: number };
export type Recipe = {
  origin?: { label: string; url: string; license: string; licenseUrl: string };
  /** Prototype cooking-yield estimates, not measured weights. */
  yieldFactors?: Record<string, number>;
  source?: "ai";
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
  estimatedWeightGrams?: number;
  cookedWeightGrams?: number;
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
  profileConfirmed?: boolean;
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
  recipeFeedback?: RecipeFeedback[];
  aiRecipes?: Recipe[];
  profile?: UserProfile;
  version: 1;
  pantry: PantryItem[];
  batches: Batch[];
  diary: DiaryEntry[];
  customFoods: Food[];
  settings: Settings;
};
/** Taste signals contain recipe features, never shopping quantities. */
export type RecipeFeedback = {
  recipeId: string;
  name: string;
  ingredients: string[];
  category: string;
  rating: "like" | "dislike";
  updatedAt: string;
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
