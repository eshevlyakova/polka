import { Select } from "../Select";
import { Modal } from "../../components/ui";
import { cook } from "../../domain/actions";
import { inputNumber } from "../../domain/input";
import { type Recipe } from "../../domain/model";

import type { AppController } from "../../hooks/useAppController";
export function OwnRecipeDialog({ app }: { app: AppController }) {
  const {
    state,
    commit,
    setTab,
    modal,
    setModal,
    draft,
    setDraft,
    catalog,
    form,
  } = app;
  return (
    <>
      {modal === "own" && (
        <Modal title="Своё блюдо" onClose={() => setModal(null)}>
          <form
            onSubmit={form((d) => {
              const name = String(d.get("name")).trim();
              if (!name) throw new Error("Укажи название");
              const recipe: Recipe = {
                id: crypto.randomUUID(),
                name,
                emoji: "🍽️",
                minutes: 0,
                servings: inputNumber(d, "servings", 1),
                equipment: "",
                ingredients: draft,
                steps: [],
              };
              commit(
                cook(
                  state,
                  recipe,
                  draft,
                  catalog,
                  crypto.randomUUID(),
                  new Date().toISOString(),
                ),
              );
              setModal(null);
              setTab("recipes");
            })}
          >
            <label>
              Название
              <input name="name" required maxLength={80} />
            </label>
            <label>
              Число равных порций
              <input
                name="servings"
                type="number"
                min="1"
                step="1"
                defaultValue="2"
                required
              />
            </label>
            {draft.map((i, index) => (
              <div className="ingredient" key={index}>
                <Select
                  aria-label="Продукт"
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
                  aria-label="Граммовка"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={i.grams}
                  onChange={(e) =>
                    setDraft(
                      draft.map((x, j) =>
                        j === index
                          ? { ...x, grams: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setDraft(draft.filter((_, j) => j !== index))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setDraft([...draft, { foodId: catalog[0].id, grams: 50 }])
              }
            >
              + Ингредиент
            </button>
            <p className="muted">
              Ингредиенты спишутся с полки. Недостающие добавь заранее.
              Съеденную часть можно записать после приготовления.
            </p>
            <button className="primary">Сохранить приготовление</button>
          </form>
        </Modal>
      )}
    </>
  );
}
