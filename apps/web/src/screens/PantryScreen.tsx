import { PreparedFood } from "../components/PreparedFood";
import { FoodArt } from "../components/FoodArt";
import { Plus, Trash2, Pencil, ChefHat } from "lucide-react";
import { Empty } from "../components/ui";

import type { AppController } from "../hooks/useAppController";
export function PantryScreen({ app }: { app: AppController }) {
  const {
    state,
    commit,
    tab,
    setEditingPantryId,
    openPantry,
    openFoodRecipes,
    run,
    foodName,
    pantrySection,
    setPantrySection,
  } = app;
  const visible = state.pantry.filter((p) => p.grams > 0);
  return (
    <>
      {tab === "pantry" && (
        <>
          <header className="pantry-heading">
            <div>
              <h1>Запасы</h1>
            </div>
            {pantrySection === "products" && (
              <button
                className="pantry-add"
                aria-label="Добавить продукт"
                onClick={() => openPantry()}
              >
                <Plus size={18} />
                Добавить
              </button>
            )}
          </header>
          <nav className="pantry-sections" aria-label="Категории полки">
            <button
              aria-pressed={pantrySection === "products"}
              onClick={() => setPantrySection("products")}
            >
              Продукты<span>{visible.length}</span>
            </button>
            <button
              aria-pressed={pantrySection === "prepared"}
              onClick={() => setPantrySection("prepared")}
            >
              Готовая еда
              <span>
                {
                  state.batches.filter(
                    (batch) => batch.remainingFraction > 1e-6,
                  ).length
                }
              </span>
            </button>
          </nav>
          {pantrySection === "prepared" ? (
            <PreparedFood app={app} />
          ) : (
            <>
              {visible.length ? (
                visible.map((p) => (
                  <article className="item pantry-item" key={p.id}>
                    <FoodArt
                      foodId={p.foodId}
                      name={p.label || foodName(p.foodId)}
                    />
                    <div className="grow">
                      <button
                        className="pantry-product-name"
                        onClick={() => openFoodRecipes(p.foodId)}
                        aria-label={`Найти рецепты: ${foodName(p.foodId)}`}
                      >
                        {p.label || foodName(p.foodId)}
                      </button>
                      <div className="pantry-product-tags">
                        <p>
                          {p.grams.toLocaleString("ru", {
                            maximumFractionDigits: 1,
                          })}{" "}
                          г
                        </p>
                        <button
                          className="pantry-recipes-button"
                          onClick={() => openFoodRecipes(p.foodId)}
                          aria-label={`Рецепты с продуктом: ${foodName(p.foodId)}`}
                        >
                          <ChefHat size={14} />
                          Рецепты
                        </button>
                      </div>
                    </div>
                    <div className="pantry-item-actions">
                      <button
                        className="icon-button"
                        aria-label={`Изменить ${foodName(p.foodId)}`}
                        onClick={() => setEditingPantryId(p.id)}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Удалить ${foodName(p.foodId)}`}
                        onClick={() =>
                          run(() =>
                            commit({
                              ...state,
                              pantry: state.pantry.filter((x) => x.id !== p.id),
                            }),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <Empty>Полка пока пустая. Начни с нескольких продуктов.</Empty>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
