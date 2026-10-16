import { useState } from "react";
import { expiryDays } from "../domain/input";
import { FoodArt } from "../components/FoodArt";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Empty } from "../components/ui";

import type { AppController } from "../hooks/useAppController";
export function PantryScreen({ app }: { app: AppController }) {
  const {
    state,
    commit,
    tab,
    setModal,
    setEditingPantryId,
    catalog,
    run,
    foodName,
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
            <button
              className="round"
              aria-label="Добавить продукт"
              onClick={() => setModal("pantry")}
            >
              <Plus />
            </button>
          </div>
          <p className="muted">Всё нужное под рукой.</p>
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
                  <b>{foodName(p.foodId)}</b>
                  <p>
                    {p.grams} г ·{" "}
                    {p.expiresOn
                      ? `до ${new Date(p.expiresOn + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "short" })}`
                      : "срок не указан"}
                  </p>
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
            <Empty>Полка пока пустая. Начни с нескольких продуктов.</Empty>
          )}
          <button className="secondary" onClick={() => setModal("food")}>
            Создать продукт по этикетке
          </button>
        </>
      )}
    </>
  );
}
