import { RecipeExpiry } from "../components/RecipeExpiry";
import { RecipeArt } from "../components/FoodArt";
import { useMemo, useState, useRef, useEffect, type FormEvent } from "react";
import { foods, recipes } from "../data/catalog";
import type { IntakeSource } from "../domain/intake";
import { expiryDays } from "../domain/input";
import { localDate, type Ingredient, type Recipe } from "../domain/model";
import { calculate, sum } from "../domain/nutrition";
import { usePolkaState } from "../hooks/usePolkaState";
import { telegram } from "../telegram";
type Tab = "today" | "pantry" | "recipes" | "diary" | "profile";
export function useAppController() {
  const {
    state,
    setState,
    error,
    setError,
    storageBlocked,
    setStorageBlocked,
    commit,
  } = usePolkaState();
  const [tab, setTabState] = useState<Tab>("today");
  const history = useRef<Tab[]>([]);
  function setTab(next: Tab) {
    if (next === tab) return;
    history.current.push(tab);
    setTabState(next);
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }
  const [modal, setModal] = useState<
    "food" | "catalog" | "pantry" | "own" | "profile" | "weight" | null
  >(null);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [editingPantryId, setEditingPantryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  function goBack() {
    if (editingPantryId) {
      setEditingPantryId(null);
      return;
    }
    if (editingEntryId) {
      setEditingEntryId(null);
      return;
    }
    if (selected) {
      setSelected(null);
      return;
    }
    if (modal) {
      setModal(null);
      return;
    }
    setTabState(history.current.pop() ?? "today");
  }
  useEffect(() => {
    const button = telegram?.BackButton;
    if (!button) return;
    if (modal || selected || editingPantryId || editingEntryId) button.show();
    else button.hide();
    button.onClick(goBack);
    return () => button.offClick(goBack);
  }, [tab, modal, selected, editingPantryId, editingEntryId]);
  const [draft, setDraft] = useState<Ingredient[]>([]);
  const [foodContext, setFoodContext] = useState<{
    meal: string;
    date: string;
    source: IntakeSource;
    itemId?: string;
  }>({ meal: "Завтрак", date: localDate(), source: "pantry" });
  function openFood(
    meal = "Завтрак",
    date = localDate(),
    source: IntakeSource = state.pantry.some((item) => item.grams > 0)
      ? "pantry"
      : "other",
    itemId?: string,
  ) {
    setFoodContext({ meal, date, source, itemId });
    setModal("food");
  }
  const [pantryFoodId, setPantryFoodId] = useState<string | null>(null);
  function openPantry(foodId?: string) {
    setPantryFoodId(foodId ?? null);
    setModal("pantry");
  }
  const [pantrySection, setPantrySection] = useState<"products" | "prepared">(
    "products",
  );
  function openPreparedFood() {
    setPantrySection("prepared");
    setTab("pantry");
  }
  const [recipeFoodId, setRecipeFoodId] = useState<string | null>(null);
  function openFoodRecipes(foodId: string) {
    setPantrySection("products");
    setRecipeFoodId(foodId);
    setTab("recipes");
  }
  const [diaryDate, setDiaryDate] = useState(localDate());
  const [message, setMessage] = useState("");
  const catalog = useMemo(
    () => [...foods, ...state.customFoods],
    [state.customFoods],
  );
  const total = sum(
    state.diary.filter((e) => e.date === localDate()).map((e) => e.nutrients),
  );
  function run(action: () => void) {
    try {
      action();
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось выполнить действие",
      );
    }
  }
  function openRecipe(recipe: Recipe) {
    setSelected(recipe);
    setDraft(recipe.ingredients.map((i) => ({ ...i })));
  }
  function form(handler: (d: FormData) => void) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      run(() => handler(data));
    };
  }
  const foodName = (id: string) => catalog.find((f) => f.id === id)?.name ?? id;
  const available = (id: string) =>
    state.pantry
      .filter((p) => p.foodId === id)
      .reduce((a, p) => a + p.grams, 0);
  const sortedRecipes = [...recipes]
    .filter(
      (r) =>
        r.minutes <= state.settings.maxMinutes &&
        !r.ingredients.some((i) =>
          state.settings.exclusions
            .split(",")
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean)
            .some((x) => foodName(i.foodId).toLowerCase().includes(x)),
        ),
    )
    .sort(
      (a, b) =>
        b.ingredients.filter((i) => available(i.foodId) >= i.grams).length -
        a.ingredients.filter((i) => available(i.foodId) >= i.grams).length,
    );
  function download(raw: string) {
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `polka-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function syncReminders(enabled: boolean) {
    const api = import.meta.env.VITE_API_URL;
    if (!api || !telegram?.initData) {
      setError("Нужен настроенный бэкенд и открытие через Telegram");
      return;
    }
    try {
      const soon = state.pantry.filter(
        (p) =>
          p.expiresOn &&
          expiryDays(p.expiresOn)! >= 0 &&
          expiryDays(p.expiresOn)! <= 2,
      );
      const body = enabled
        ? {
            enabled: true,
            items: soon.map((p) => ({
              name: foodName(p.foodId),
              expiresOn: p.expiresOn,
            })),
          }
        : { enabled: false, items: [] };
      const response = await fetch(`${api}/api/reminders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `tma ${telegram.initData}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        throw new Error(
          "Не удалось обновить напоминания. Открой приложение заново; сначала нажми /start в боте.",
        );
      setMessage(
        enabled
          ? "Сроки на ближайшие 2 дня переданы боту. После изменения полки обнови их снова."
          : "Ожидающие напоминания отключены.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    }
  }
  return {
    state,
    setState,
    error,
    setError,
    storageBlocked,
    setStorageBlocked,
    commit,
    tab,
    setTab,
    goBack,
    modal,
    setModal,
    selected,
    setSelected,
    draft,
    setDraft,
    diaryDate,
    setDiaryDate,
    message,
    setMessage,
    catalog,
    foodContext,
    openFood,
    total,
    run,
    form,
    foodName,
    available,
    sortedRecipes,
    pantrySection,
    setPantrySection,
    openPreparedFood,
    recipeFoodId,
    setRecipeFoodId,
    openFoodRecipes,
    download,
    syncReminders,
    openRecipe,
    recipeCard,
    recordBatch,
    editingPantryId,
    setEditingPantryId,
    editingEntryId,
    setEditingEntryId,
    pantryFoodId,
    openPantry,
  };
  function recipeCard(r: Recipe) {
    const missing = r.ingredients.filter((i) => available(i.foodId) < i.grams);
    return (
      <button
        className="card recipe-card"
        key={r.id}
        onClick={() => openRecipe(r)}
      >
        <div className="recipe-art">
          <RecipeArt recipeId={r.id} />
        </div>
        <div className="recipe-content">
          <h3>{r.name}</h3>
          <RecipeExpiry
            ingredients={r.ingredients}
            pantry={state.pantry}
            catalog={catalog}
          />
          <p>
            {r.minutes} мин ·{" "}
            {Math.round(calculate(r.ingredients, catalog).kcal / r.servings)}{" "}
            ккал / порция
          </p>
          <span className="badge">
            {missing.length
              ? `Нужно добавить ${missing.length} продукта`
              : "Всё есть на полке"}
          </span>
          <span className="recipe-action">
            Посмотреть рецепт <span>↗</span>
          </span>
        </div>
      </button>
    );
  }
  function recordBatch(id: string) {
    openFood("Завтрак", localDate(), "prepared", id);
  }
}

export type AppController = ReturnType<typeof useAppController>;
