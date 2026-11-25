import { useRecipePresence } from "../hooks/useRecipePresence";
import { useEffect, useMemo, useState } from "react";
import type { LibraryMetadata } from "../../../../shared/recipeLibrary";
import { personalLibraryIdeas } from "../domain/personalIdeas";
import { homeIdeas } from "../domain/homeIdeas";
import { LibraryRecipeCard } from "./LibraryRecipeCard";
import type { AppController } from "../hooks/useAppController";

export function PersonalIdeas({ app }: { app: AppController }) {
  const [catalog, setCatalog] = useState<LibraryMetadata[]>([]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const hasProducts = app.state.pantry.some((p) => p.grams > 0);
  useEffect(() => {
    if (!hasProducts) return;
    let active = true;
    // Public reference data only. No account information is included in this chunk.
    import("../../../backend/data/recipe-library-index.json")
      .then((module) => {
        if (active) {
          setCatalog(module.default);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [hasProducts, attempt]);
  const ideas = useMemo(
    () =>
      personalLibraryIdeas(catalog, app.state, app.catalog, app.recipeFoodId),
    [catalog, app.state, app.catalog, app.recipeFoodId],
  );
  const fallback = homeIdeas(
    app.sortedRecipes,
    app.state.pantry,
    app.catalog,
  ).filter(
    (r) =>
      !app.isRecipeRated(r.id) &&
      (!app.recipeFoodId ||
        r.ingredients.some((i) => i.foodId === app.recipeFoodId)),
  );
  const visibleFallback = useRecipePresence(fallback, app.isRecipeRated);
  const visibleIdeas = useRecipePresence(ideas, app.isRecipeRated);
  if (!hasProducts) return null;
  const hasIdeas = ideas.length > 0 || (!catalog.length && fallback.length > 0);
  return (
    <section className="personal-ideas" aria-labelledby="personal-ideas-title">
      <div className="section-title home-recipes-heading">
        <h2 id="personal-ideas-title">Идеи для тебя</h2>
      </div>
      <div className="home-recipes">
        {visibleIdeas.map(({ item: recipe, leaving }) => (
          <LibraryRecipeCard
            key={recipe.id}
            recipe={recipe}
            leaving={leaving}
            onOpen={app.openLibraryRecipe}
            disabled={app.saving}
            onRate={(rating) => app.rateLibraryRecipe(recipe, rating)}
          />
        ))}
        {!catalog.length &&
          visibleFallback.map(({ item, leaving }) =>
            app.recipeCard(item, leaving),
          )}
      </div>
      {!hasIdeas && (
        <p className="empty">
          {catalog.length
            ? "Пока нет новых подходящих идей. Попробуй задать пожелание выше."
            : failed
              ? "Не удалось загрузить идеи."
              : "Подбираем идеи из твоих продуктов…"}
        </p>
      )}
      {failed && (
        <button
          className="text-button"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Повторить загрузку идей
        </button>
      )}
    </section>
  );
}
