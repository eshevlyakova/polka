import { Select } from "../Select";
import { PhotoCredits } from "../PhotoCredits";
import { RecipeArt } from "../FoodArt";
import { Macros, Modal } from "../../components/ui";
import { cook } from "../../domain/actions";
import { calculate } from "../../domain/nutrition";

import type { AppController } from "../../hooks/useAppController";
export function RecipeDialog({ app }: { app: AppController }) {
  const {
    state,
    commit,
    setTab,
    selected,
    setSelected,
    draft,
    setDraft,
    setMessage,
    catalog,
    run,
  } = app;
  return (
    <>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="recipe-art">
            <RecipeArt recipeId={selected.id} />
          </div>
          <p>
            {selected.minutes} мин · {selected.servings} равных порций ·{" "}
            {selected.equipment}
          </p>
          <details className="photo-attribution">
            <summary>Фото и источник</summary>
            <PhotoCredits recipeId={selected.id} />
          </details>
          <h3>Фактический состав</h3>
          {draft.map((i, index) => (
            <div className="ingredient" key={index}>
              <Select
                aria-label="Ингредиент"
                value={i.foodId}
                onChange={(e) =>
                  setDraft(
                    draft.map((x, j) =>
                      j === index ? { ...x, foodId: e.target.value } : x,
                    ),
                  )
                }
              >
                {catalog.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              <input
                aria-label="Масса ингредиента, г"
                type="number"
                min="0.1"
                step="0.1"
                value={i.grams}
                onChange={(e) =>
                  setDraft(
                    draft.map((x, j) =>
                      j === index ? { ...x, grams: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
              <span>г</span>
              <button
                className="icon-button"
                aria-label="Убрать ингредиент"
                onClick={() => setDraft(draft.filter((_, j) => j !== index))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="text-button"
            onClick={() =>
              setDraft([...draft, { foodId: catalog[0].id, grams: 50 }])
            }
          >
            + Ингредиент
          </button>
          <Macros
            n={calculate(
              draft.map((i) => ({
                ...i,
                grams: Math.max(0, Number.isFinite(i.grams) ? i.grams : 0),
              })),
              catalog,
            )}
          />
          <p className="muted">
            На всё блюдо. Укажи фактические количества, включая масло и соусы.
          </p>
          <ol>
            {selected.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <button
            className="primary"
            onClick={() =>
              run(() => {
                const next = cook(
                  state,
                  selected,
                  draft,
                  catalog,
                  crypto.randomUUID(),
                  new Date().toISOString(),
                );
                commit(next);
                setSelected(null);
                setMessage(
                  "Блюдо приготовлено, продукты списаны. Запиши съеденную часть в разделе «Рецепты».",
                );
                setTab("recipes");
              })
            }
          >
            Приготовил — списать продукты
          </button>
        </Modal>
      )}
    </>
  );
}
