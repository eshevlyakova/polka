import { ReadyMeals } from "../components/ReadyMeals";
import { shortages } from "../domain/cooking";
import { ArrowLeft, ChefHat, X } from "lucide-react";
import { AiRecipesPanel } from "../components/AiRecipesPanel";
import { Empty } from "../components/ui";
import type { AppController } from "../hooks/useAppController";

export function HomeScreen({ app }: { app: AppController }) {
  if (app.tab !== "home") return null;
  const { state, sortedRecipes, recipeFoodId, setRecipeFoodId, foodName } = app;
  const recipes = recipeFoodId
    ? sortedRecipes.filter((r) =>
        r.ingredients.some((i) => i.foodId === recipeFoodId && i.grams > 0),
      )
    : sortedRecipes;
  const ready = recipes.filter(
    (r) => !shortages(r.ingredients, state.pantry, app.catalog).length,
  );
  const missing = recipes.filter(
    (r) => shortages(r.ingredients, state.pantry, app.catalog).length,
  );
  const preview = [...ready.slice(0, 2), ...missing.slice(0, 1)];
  for (const recipe of recipes)
    if (preview.length < 3 && !preview.includes(recipe)) preview.push(recipe);
  return (
    <section className="home-page">
      {recipeFoodId && (
        <section
          className="recipe-product-filter"
          aria-label="Подборка по продукту"
        >
          <div>
            <ChefHat size={21} />
            <span>
              Рецепты с продуктом<strong>{foodName(recipeFoodId)}</strong>
            </span>
            <button
              className="icon-button"
              aria-label="Сбросить фильтр по продукту"
              onClick={() => setRecipeFoodId(null)}
            >
              <X size={19} />
            </button>
          </div>
          <button
            className="text-button"
            onClick={() => {
              setRecipeFoodId(null);
              app.setTab("pantry");
            }}
          >
            <ArrowLeft size={16} />К полке
          </button>
        </section>
      )}
      <AiRecipesPanel app={app} />
      <ReadyMeals app={app} />
      <div className="section-title home-recipes-heading">
        <h2>Идеи для тебя</h2>
      </div>
      <div className="home-recipes">{preview.map(app.recipeCard)}</div>
      {!recipes.length && (
        <Empty>
          {recipeFoodId
            ? "Под выбранное время и предпочтения рецептов с этим продуктом пока нет. Попробуй персональный подбор."
            : "Попробуй изменить время или предпочтения — или подбери рецепт по своим пожеланиям."}
        </Empty>
      )}
    </section>
  );
}
