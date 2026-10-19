import { ChefHat, X, ArrowLeft } from "lucide-react";
import { Empty } from "../components/ui";
import { Select } from "../components/Select";
import type { AppController } from "../hooks/useAppController";
export function RecipesScreen({ app }: { app: AppController }) {
  const {
    state,
    commit,
    tab,
    setModal,
    setDraft,
    catalog,
    run,
    sortedRecipes,
    recipeCard,
    recipeFoodId,
    setRecipeFoodId,
    foodName,
    setTab,
  } = app;
  const visibleRecipes = recipeFoodId
    ? sortedRecipes.filter((recipe) =>
        recipe.ingredients.some(
          (item) => item.foodId === recipeFoodId && item.grams > 0,
        ),
      )
    : sortedRecipes;
  return (
    <>
      {tab === "recipes" && (
        <>
          <h1>Что приготовим?</h1>
          <p className="muted">Простые варианты без лишних покупок.</p>
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
                  setTab("pantry");
                }}
              >
                <ArrowLeft size={16} />К полке
              </button>
            </section>
          )}
          <label>
            Время приготовления
            <Select
              value={state.settings.maxMinutes}
              onChange={(e) =>
                run(() =>
                  commit({
                    ...state,
                    settings: {
                      ...state.settings,
                      maxMinutes: Number(e.target.value),
                    },
                  }),
                )
              }
            >
              <option value={10}>До 10 минут</option>
              <option value={20}>До 20 минут</option>
              <option value={30}>До 30 минут</option>
            </Select>
          </label>
          {visibleRecipes.map(recipeCard)}
          {!visibleRecipes.length && (
            <Empty>
              {recipeFoodId
                ? "В нашем небольшом каталоге пока нет рецептов с этим продуктом под выбранное время и исключения."
                : "Под выбранное время и исключения рецептов пока нет."}
            </Empty>
          )}
          {recipeFoodId && (
            <button
              className="text-button"
              onClick={() => setRecipeFoodId(null)}
            >
              Показать все рецепты
            </button>
          )}
          <button
            className="secondary"
            onClick={() => {
              setDraft([{ foodId: recipeFoodId ?? catalog[0].id, grams: 100 }]);
              setModal("own");
            }}
          >
            Приготовил своё блюдо
          </button>
        </>
      )}
    </>
  );
}
