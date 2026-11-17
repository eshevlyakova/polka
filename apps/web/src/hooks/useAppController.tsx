import {
  Sparkles,
  Clock3,
  CheckCircle2,
  ShoppingBasket,
  ArrowUpRight,
} from "lucide-react";
import { shortages } from "../domain/cooking";
import { currentMeal } from "../domain/meal";
import { useRecipeLibrary } from "./useRecipeLibrary";
import type { LibraryCard } from "../../../../shared/recipeLibrary";
import { recipePriority } from "../domain/recipePriority";
import { RecipeArt } from "../components/FoodArt";
import { useMemo, useState, useRef, useEffect, type FormEvent } from "react";
import { foods, recipes } from "../data/catalog";
import type { IntakeSource } from "../domain/intake";
import { localDate, type Ingredient, type Recipe } from "../domain/model";
import { calculate, sum } from "../domain/nutrition";
import { usePolkaState } from "../hooks/usePolkaState";
import { telegram } from "../telegram";
type Tab = "home" | "pantry" | "diary" | "profile";
export function useAppController() {
  const library = useRecipeLibrary();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryRecipeId, setLibraryRecipeId] = useState<string | null>(null);
  const libraryScroll = useRef(0);
  function openLibrary() {
    libraryScroll.current = 0;
    setLibraryOpen(true);
    setLibraryRecipeId(null);
    window.history.pushState({ polkaLibrary: true }, "", "#recipes");
    window.scrollTo?.(0, 0);
  }
  function openLibraryRecipe(recipe: LibraryCard) {
    libraryScroll.current = window.scrollY;
    setLibraryRecipeId(recipe.id);
    window.history.pushState(
      { polkaLibrary: true },
      "",
      `#library=${encodeURIComponent(recipe.id)}`,
    );
    window.scrollTo?.(0, 0);
  }
  function closeLibrary() {
    setLibraryOpen(false);
    setLibraryRecipeId(null);
    if (window.history.state?.polkaLibrary) window.history.back();
    else
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
  }
  const {
    state,
    setState,
    error,
    setError,
    storageBlocked,
    setStorageBlocked,
    commit,
    session,
    saving,
    saveError,
    retrySave,
  } = usePolkaState();
  const [tab, setTabState] = useState<Tab>("home");
  const history = useRef<Tab[]>([]);
  function setTab(next: Tab) {
    if (next === tab) return;
    history.current.push(tab);
    setTabState(next);
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }
  const [modal, setModal] = useState<
    | "food"
    | "catalog"
    | "pantry"
    | "add-pantry"
    | "receipt"
    | "own"
    | "profile"
    | "weight"
    | null
  >(null);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [recipeServings, setRecipeServings] = useState(1);
  const [editingPantryId, setEditingPantryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  function goBack() {
    if (saving || saveError) return;
    if (editingPantryId) {
      setEditingPantryId(null);
      return;
    }
    if (editingEntryId) {
      setEditingEntryId(null);
      return;
    }
    if (modal) {
      setModal(null);
      return;
    }
    if (selected) {
      closeRecipe();
      return;
    }
    if (libraryRecipeId || libraryOpen) {
      closeLibrary();
      return;
    }
    setTabState(history.current.pop() ?? "home");
  }
  useEffect(() => {
    const button = telegram?.BackButton;
    if (!button) return;
    if (
      modal ||
      selected ||
      editingPantryId ||
      editingEntryId ||
      libraryOpen ||
      libraryRecipeId
    )
      button.show();
    else button.hide();
    button.onClick(goBack);
    return () => button.offClick(goBack);
  }, [
    tab,
    modal,
    selected,
    editingPantryId,
    editingEntryId,
    libraryOpen,
    libraryRecipeId,
    saving,
    saveError,
  ]);
  const [draft, setDraft] = useState<Ingredient[]>([]);
  const [foodContext, setFoodContext] = useState<{
    meal: string;
    date: string;
    source: IntakeSource;
    itemId?: string;
  }>({ meal: currentMeal(), date: localDate(), source: "pantry" });
  function openFood(
    meal = currentMeal(),
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
    setModal(foodId ? "pantry" : "add-pantry");
  }
  const [pantrySection, setPantrySection] = useState<"products" | "prepared">(
    "products",
  );
  function openPreparedFood() {
    setPantrySection("prepared");
    setTab("pantry");
  }
  function finishCooking() {
    setSelected(null);
    setLibraryRecipeId(null);
    setLibraryOpen(false);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    openPreparedFood();
  }
  const [recipeFoodId, setRecipeFoodId] = useState<string | null>(null);
  function openFoodRecipes(foodId: string) {
    setPantrySection("products");
    setRecipeFoodId(foodId);
    setTab("home");
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
  async function run(action: () => void | Promise<void>) {
    try {
      await action();
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
    setRecipeServings(recipe.servings);
    if (window.location.hash !== `#recipe=${encodeURIComponent(recipe.id)}`)
      window.history.pushState(
        { polkaRecipe: true },
        "",
        `#recipe=${encodeURIComponent(recipe.id)}`,
      );
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }
  function closeRecipe() {
    setSelected(null);
    if (window.location.hash.startsWith("#recipe=")) {
      if (window.history.state?.polkaRecipe) window.history.back();
      else
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
    }
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    function route() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      setLibraryRecipeId(params.get("library"));
      const results = window.location.hash === "#recipes";
      setLibraryOpen(results);
      if (results)
        window.requestAnimationFrame?.(() =>
          window.scrollTo?.(0, libraryScroll.current),
        );
      const id = new URLSearchParams(window.location.hash.slice(1)).get(
        "recipe",
      );
      const recipe = [...recipes, ...(state.aiRecipes ?? [])].find(
        (r) => r.id === id,
      );
      setSelected(recipe ?? null);
      if (recipe) {
        setDraft(recipe.ingredients.map((i) => ({ ...i })));
        setRecipeServings(recipe.servings);
      }
    }
    route();
    window.addEventListener("popstate", route);
    return () => window.removeEventListener("popstate", route);
  }, [state.aiRecipes]);
  function form(handler: (d: FormData) => void | Promise<void>) {
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
        Number(b.ingredients.every((i) => available(i.foodId) >= i.grams)) -
          Number(a.ingredients.every((i) => available(i.foodId) >= i.grams)) ||
        recipePriority(b.ingredients, state.pantry, catalog) -
          recipePriority(a.ingredients, state.pantry, catalog) ||
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

  return {
    library,
    libraryOpen,
    libraryRecipeId,
    openLibrary,
    openLibraryRecipe,
    closeLibrary,
    finishCooking,
    state,
    setState,
    error,
    setError,
    storageBlocked,
    setStorageBlocked,
    commit,
    session,
    saving,
    saveError,
    retrySave,
    tab,
    setTab,
    goBack,
    modal,
    setModal,
    selected,
    setSelected,
    recipeServings,
    setRecipeServings,
    closeRecipe,
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
    const missing = shortages(r.ingredients, state.pantry, catalog);
    return (
      <button
        className="card recipe-card"
        key={r.id}
        onClick={() => openRecipe(r)}
      >
        {r.source === "ai" ? (
          <div className="ai-recipe-label">
            <Sparkles size={17} />
            Для тебя
          </div>
        ) : (
          <div className="recipe-art">
            <RecipeArt recipeId={r.id} />
            <span className="recipe-time">
              <Clock3 size={14} />
              {r.minutes} мин
            </span>
          </div>
        )}
        <div className="recipe-content">
          <h3>{r.name}</h3>
          <p>
            {r.source === "ai" ? `${r.minutes} мин · ` : ""}
            {Math.round(
              calculate(r.ingredients, catalog).kcal / r.servings,
            )}{" "}
            ккал / порция
          </p>
          <span
            className={`badge recipe-availability ${missing.length ? "needs-products" : ""}`}
          >
            {missing.length ? (
              <ShoppingBasket size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {missing.length
              ? missing.length === 1
                ? "Не всё есть на полке"
                : `Не хватает ${missing.length} продуктов`
              : "Всё есть на полке"}
          </span>
          {!!missing.length && (
            <div
              className="recipe-missing-list"
              aria-label="Недостающие продукты"
            >
              {missing.slice(0, 3).map((i) => (
                <span key={i.foodId}>{i.name}</span>
              ))}
              {missing.length > 3 && <span>ещё {missing.length - 3}</span>}
            </div>
          )}
          <span className="recipe-action">
            Посмотреть рецепт{" "}
            <span>
              <ArrowUpRight size={20} />
            </span>
          </span>
        </div>
      </button>
    );
  }
  function recordBatch(id: string) {
    openFood(currentMeal(), localDate(), "prepared", id);
  }
}

export type AppController = ReturnType<typeof useAppController>;
