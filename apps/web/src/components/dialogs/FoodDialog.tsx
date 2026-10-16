import { Select } from "../Select";
import { Modal } from "../../components/ui";
import { inputNumber } from "../../domain/input";
import { localDate, type Food } from "../../domain/model";
import { scale } from "../../domain/nutrition";

import type { AppController } from "../../hooks/useAppController";
export function FoodDialog({ app }: { app: AppController }) {
  const {
    state,
    commit,
    modal,
    setModal,
    query,
    setQuery,
    setMessage,
    catalog,
    form,
    foodContext,
  } = app;
  return (
    <>
      {modal === "food" && (
        <Modal
          title="Добавить еду"
          onClose={() => {
            setModal(null);
            setQuery("");
          }}
        >
          <form
            onSubmit={form((d) => {
              const foodId = String(d.get("foodId"));
              const grams = inputNumber(d, "grams", 0.1);
              const f = catalog.find((f) => f.id === foodId);
              if (!f) throw new Error("Выбери продукт");
              commit({
                ...state,
                diary: [
                  {
                    id: crypto.randomUUID(),
                    name: f.name,
                    date: String(d.get("date")),
                    meal: String(d.get("meal")),
                    nutrients: scale(f.per100, grams / 100),
                    amountLabel: `${grams} г`,
                    approximate: d.get("approximate") === "on",
                  },
                  ...state.diary,
                ],
              });
              setModal(null);
              setQuery("");
            })}
          >
            <label>
              Поиск
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Продукт или блюдо"
              />
            </label>
            <label>
              Позиция
              <Select name="foodId" required>
                {catalog
                  .filter((f) =>
                    f.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((f) => (
                    <option value={f.id} key={f.id}>
                      {f.name}
                    </option>
                  ))}
              </Select>
            </label>
            <div className="fields">
              <label>
                Количество, г
                <input
                  name="grams"
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                />
              </label>
              <label>
                Дата
                <input
                  name="date"
                  type="date"
                  defaultValue={foodContext.date}
                  required
                />
              </label>
            </div>
            <label>
              Приём пищи
              <Select name="meal" defaultValue={foodContext.meal}>
                <option>Завтрак</option>
                <option>Обед</option>
                <option>Ужин</option>
                <option>Перекус</option>
              </Select>
            </label>
            <label className="checkbox">
              <input type="checkbox" name="approximate" defaultChecked />
              Приблизительная запись
            </label>
            <button className="primary">Добавить в дневник</button>
          </form>
          <details>
            <summary>Нет в базе? Добавить свой продукт / блюдо</summary>
            <form
              onSubmit={form((d) => {
                const name = String(d.get("name")).trim();
                if (!name) throw new Error("Укажи название");
                const f: Food = {
                  id: crypto.randomUUID(),
                  name,
                  emoji: "🍽️",
                  per100: {
                    kcal: inputNumber(d, "kcal"),
                    protein: inputNumber(d, "protein"),
                    fat: inputNumber(d, "fat"),
                    carbs: inputNumber(d, "carbs"),
                  },
                };
                commit({ ...state, customFoods: [...state.customFoods, f] });
                setQuery(name);
                setMessage(
                  "Продукт создан. Теперь можно выбрать его и добавить съеденное количество.",
                );
              })}
            >
              <label>
                Название
                <input name="name" required maxLength={80} />
              </label>
              <p>Показатели на 100 г — по этикетке или известным данным.</p>
              {[
                ["kcal", "Ккал"],
                ["protein", "Белки, г"],
                ["fat", "Жиры, г"],
                ["carbs", "Углеводы, г"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input name={key} type="number" step="0.1" min="0" required />
                </label>
              ))}
              <button className="secondary">Создать позицию</button>
            </form>
          </details>
        </Modal>
      )}
    </>
  );
}
