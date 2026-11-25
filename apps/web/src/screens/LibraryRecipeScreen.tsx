import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  Minus,
  Plus,
  Sparkles,
  LoaderCircle,
  X,
  Check,
} from "lucide-react";
import { fetchLibraryRecipe } from "../api/recipeLibrary";
import { fetchAiRecipes } from "../api/aiRecipes";
import { buildAiRequest } from "../domain/aiContext";
import { Macros } from "../components/ui";
import { scale } from "../domain/nutrition";
import { FeedbackError } from "../components/FeedbackError";
import { useTimedError } from "../hooks/useTimedError";
import {
  ingredientOnShelf,
  libraryQuantity,
  libraryCategories,
  type LibraryRecipe,
} from "../../../../shared/recipeLibrary";
import type { AppController } from "../hooks/useAppController";
export function LibraryRecipeScreen({ app }: { app: AppController }) {
  const id = app.libraryRecipeId!;
  const [recipe, setRecipe] = useState<LibraryRecipe | null>(null),
    [loading, setLoading] = useState(true),
    [servings, setServings] = useState(1),
    [done, setDone] = useState<number[]>([]),
    [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { error, setError } = useTimedError();
  const pending = useRef<AbortController | null>(null),
    latest = useRef(app);
  latest.current = app;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRecipe(null);
    fetchLibraryRecipe(id, controller.signal)
      .then((r) => {
        if (!controller.signal.aborted) {
          setRecipe(r);
          setServings(r.servings ?? 2);
          setDone([]);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError((err as Error).message, true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      pending.current?.abort();
    };
  }, [id, attempt]);
  async function adapt() {
    if (!recipe || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const request = {
        ...buildAiRequest(
          app.state,
          app.catalog,
          `Адаптируй выбранный рецепт «${recipe.name}» под мои продукты на ${servings} порций. Сохрани характер блюда. Предложи один вариант, по возможности без замены основных ингредиентов.`,
        ),
        referenceRecipeId: recipe.id,
        maxMinutes: Math.max(recipe.minutes ?? 0, app.state.settings.maxMinutes),
      };
      const recipes = await fetchAiRecipes(request, controller.signal);
      if (controller.signal.aborted) return;
      const current = latest.current;
      if (
        JSON.stringify(request.products) !==
        JSON.stringify(
          buildAiRequest(current.state, current.catalog, request.preferences)
            .products,
        )
      )
        throw new Error("Полка изменилась во время подбора. Попробуй ещё раз.");
      await current.commit({ ...current.state, aiRecipes: recipes });
      current.openRecipe(recipes[0]);
    } catch (err) {
      if (!controller.signal.aborted) setError((err as Error).message);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  const configured =
    import.meta.env.DEV || Boolean(import.meta.env.VITE_AI_API_URL);
  return (
    <article className="recipe-page library-recipe">
      <button className="recipe-back" onClick={app.closeLibrary}>
        <ArrowLeft size={19} />К подборке
      </button>
      {loading && (
        <p className="library-loading" role="status">
          <LoaderCircle size={20} className="ai-spinner" />
          Открываем рецепт…
        </p>
      )}
      <FeedbackError message={error} onDismiss={() => setError("")} />
      {!loading && !recipe && (
        <div className="empty">
          Рецепт пока недоступен.
          <button
            className="secondary"
            onClick={() => {
              setError("");
              setAttempt(attempt + 1);
            }}
          >
            Попробовать ещё раз
          </button>
        </div>
      )}
      {recipe && (
        <>
          <header className="recipe-page-heading">
            <p className="eyebrow">
              {libraryCategories[recipe.category]} · {recipe.country}
            </p>
            <h1>{recipe.name}</h1>
            <p>
              <Clock3 size={15} />
              {recipe.minutes === null ? "Время в источнике не указано" : `${recipe.minutes} мин`}
            </p>
          </header>
          <p className="library-summary">{recipe.summary}</p>
          <section className="recipe-portions">
            <div>
              <h2>Сколько приготовим?</h2>
              {recipe.servings === null && <p className="recipe-measures-note">Порции для адаптации. Ниже — исходные количества ингредиентов.</p>}
            </div>
            <div className="portions-stepper">
              <button
                aria-label="Уменьшить порции"
                disabled={servings <= 1}
                onClick={() => setServings(servings - 1)}
              >
                <Minus size={17} />
              </button>
              <input
                aria-label="Количество порций в каталоге"
                type="number"
                min="1"
                max="50"
                value={servings}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isInteger(n) && n >= 1 && n <= 50) setServings(n);
                }}
              />
              <button
                aria-label="Увеличить порции"
                disabled={servings >= 50}
                onClick={() => setServings(servings + 1)}
              >
                <Plus size={17} />
              </button>
            </div>
          </section>
          {recipe.perServing && <section className="recipe-nutrition">
            <h3>Примерно на порцию</h3>
            <Macros n={recipe.perServing} />
            <section className="recipe-total-inline">
              <h3>На всё блюдо · {servings} порц.</h3>
              <Macros n={scale(recipe.perServing, servings)} />
            </section>
          </section>}
          <section className="recipe-ingredients">
            <div className="section-title">
              <h2>Ингредиенты</h2>
            </div>
            {recipe.ingredients.map((i, index) => (
              <div key={index} className="library-ingredient">
                <div>
                  <strong>{i.name}</strong>
                  {i.note && <small>{i.note}</small>}
                  {ingredientOnShelf(
                    i.name,
                    app.state.pantry.map((p) => ({
                      ...p,
                      name: app.foodName(p.foodId),
                    })),
                  ) && (
                    <small className="library-stock">
                      <Check size={12} />
                      Есть похожий продукт на полке
                    </small>
                  )}
                </div>
                <span>{libraryQuantity(i, servings, recipe.servings)}</span>
              </div>
            ))}
          </section>
          <section className="recipe-method" aria-label="Шаги приготовления">
            <div className="section-title">
              <h2>Как приготовить</h2>
              <span>{recipe.steps.length} шагов</span>
            </div>
            <ol>
              {recipe.steps.map((step, index) => (
                <li
                  className={done.includes(index) ? "step-done" : ""}
                  key={index}
                >
                  <button
                    aria-label={`Шаг ${index + 1} выполнен`}
                    aria-pressed={done.includes(index)}
                    onClick={() =>
                      setDone(
                        done.includes(index)
                          ? done.filter((i) => i !== index)
                          : [...done, index],
                      )
                    }
                  >
                    {done.includes(index) ? <Check size={18} /> : index + 1}
                  </button>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>
          <section className="recipe-finish">
            <h2>Готовим из твоих продуктов</h2>
            <p className="recipe-measures-note">
              Состав и КБЖУ — по твоим продуктам.
            </p>

            <button
              className="primary"
              disabled={busy || !configured}
              onClick={() => void adapt()}
            >
              {busy ? (
                <LoaderCircle className="ai-spinner" size={18} />
              ) : (
                <Sparkles size={18} />
              )}{" "}
              {busy ? "Подбираем состав…" : "Подготовить рецепт"}
            </button>
            {busy && (
              <button
                className="primary cancel-action"
                onClick={() => {
                  pending.current?.abort();
                  pending.current = null;
                  setBusy(false);
                }}
              >
                <X size={17} />
                Отменить подбор
              </button>
            )}
            {!configured && (
              <p className="recipe-measures-note">
                Подбор замен сейчас недоступен. Рецепт можно
                читать и менять количество порций.
              </p>
            )}
          </section>
          <p className="library-attribution">
            Рецепт:{" "}
            <a href={recipe.origin.url} target="_blank" rel="noreferrer">
              {recipe.origin.label}
            </a>{" "}
            ·{" "}
            <a href={recipe.origin.licenseUrl} target="_blank" rel="noreferrer">
              {recipe.origin.license}
            </a>
            {recipe.perServing ? ". КБЖУ — оценка из источника." : ". В источнике нет КБЖУ; рассчитаем по составу после подготовки рецепта."}
          </p>
        </>
      )}
    </article>
  );
}
