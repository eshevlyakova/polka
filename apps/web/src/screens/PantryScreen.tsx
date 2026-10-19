import { PreparedFood } from "../components/PreparedFood";
import { useState } from "react";
import { expiryDays } from "../domain/input";
import { FoodArt } from "../components/FoodArt";
import { Plus, Trash2, Pencil, ChefHat } from "lucide-react";
import { Empty } from "../components/ui";

import type { AppController } from "../hooks/useAppController";
export function PantryScreen({ app }: { app: AppController }) {
  const {
    state,
    commit,
    tab,
    setModal,
    setEditingPantryId,
    openPantry,
    openFoodRecipes,
    run,
    foodName,
    pantrySection,
    setPantrySection,
  } = app;
  const [filter, setFilter] = useState<"all" | "soon">("all");
  const visible = state.pantry.filter(
    (p) => filter === "all" || (p.expiresOn && expiryDays(p.expiresOn)! <= 2),
  );
  return (
    <>
      {tab === "pantry" && (
        <>
          <div className="heading">
            <h1>Моя полка</h1>
            {pantrySection === "products" && (
              <button
                className="round"
                aria-label="Добавить продукт"
                onClick={() => openPantry()}
              >
                <Plus />
              </button>
            )}
          </div>
          <p className="muted">Всё нужное под рукой.</p>
          <nav className="pantry-sections" aria-label="Категории полки">
            <button
              aria-pressed={pantrySection === "products"}
              onClick={() => setPantrySection("products")}
            >
              Продукты<span>{state.pantry.length}</span>
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
              <div className="filter-chips">
                <button
                  className={filter === "all" ? "selected" : ""}
                  onClick={() => setFilter("all")}
                >
                  Все продукты <span>{state.pantry.length}</span>
                </button>
                <button
                  className={filter === "soon" ? "selected" : ""}
                  onClick={() => setFilter("soon")}
                >
                  Скоро использовать
                </button>
              </div>
              {visible.length ? (
                visible.map((p) => (
                  <div className="item" key={p.id}>
                    <FoodArt foodId={p.foodId} />
                    <div className="grow">
                      <button
                        className="pantry-product-name"
                        onClick={() => openFoodRecipes(p.foodId)}
                        aria-label={`Найти рецепты: ${foodName(p.foodId)}`}
                      >
                        {foodName(p.foodId)}
                      </button>
                      <p>
                        {p.grams} г ·{" "}
                        {p.expiresOn
                          ? `до ${new Date(p.expiresOn + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "short" })}`
                          : "срок не указан"}
                      </p>
                      <div className="pantry-product-tags">
                        {p.expiresOn && (
                          <span
                            className={`expiry-badge ${expiryDays(p.expiresOn)! <= 2 ? "soon" : ""}`}
                          >
                            {expiryDays(p.expiresOn)! < 0
                              ? "Срок прошёл"
                              : expiryDays(p.expiresOn) === 0
                                ? "Использовать сегодня"
                                : `Ещё ${expiryDays(p.expiresOn)} дн.`}
                          </span>
                        )}
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
                ))
              ) : (
                <Empty>
                  {filter === "soon"
                    ? "Продуктов с ближайшим сроком пока нет."
                    : "Полка пока пустая. Начни с нескольких продуктов."}
                </Empty>
              )}
              <button className="secondary" onClick={() => setModal("catalog")}>
                Создать продукт по этикетке
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}
