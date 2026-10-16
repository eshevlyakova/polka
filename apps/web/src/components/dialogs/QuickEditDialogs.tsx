import { Select } from "../Select";
import { useState } from "react";
import { Modal, Macros } from "../ui";
import { localDate, type Batch } from "../../domain/model";
import { scale } from "../../domain/nutrition";
import { eat } from "../../domain/actions";
import { inputNumber } from "../../domain/input";
import type { AppController } from "../../hooks/useAppController";
export function QuickEditDialogs({ app }: { app: AppController }) {
  const {
    state,
    editingPantryId,
    setEditingPantryId,
    editingEntryId,
    setEditingEntryId,
    portionBatchId,
    setPortionBatchId,
    commit,
    form,
    foodName,
  } = app;
  const product = state.pantry.find((p) => p.id === editingPantryId);
  const entry = state.diary.find((e) => e.id === editingEntryId);
  const batch = state.batches.find((b) => b.id === portionBatchId);
  return (
    <>
      {product && (
        <Modal
          title={foodName(product.foodId)}
          onClose={() => setEditingPantryId(null)}
        >
          <form
            onSubmit={form((d) => {
              const grams = inputNumber(d, "grams", 0.1);
              const expiresOn = String(d.get("expiresOn") || "");
              commit({
                ...state,
                pantry: state.pantry.map((p) =>
                  p.id === product.id ? { ...p, grams, expiresOn } : p,
                ),
              });
              setEditingPantryId(null);
            })}
          >
            <label>
              Количество, г
              <input
                type="number"
                name="grams"
                min="0.1"
                step="0.1"
                defaultValue={product.grams}
                required
              />
            </label>
            <label>
              Срок годности
              <input
                type="date"
                name="expiresOn"
                defaultValue={product.expiresOn}
              />
            </label>
            <button className="primary">Сохранить изменения</button>
          </form>
        </Modal>
      )}
      {entry && (
        <Modal title="Изменить запись" onClose={() => setEditingEntryId(null)}>
          <form
            onSubmit={form((d) => {
              const name = String(d.get("name")).trim();
              if (!name) throw new Error("Укажи название");
              commit({
                ...state,
                diary: state.diary.map((e) =>
                  e.id === entry.id
                    ? {
                        ...e,
                        name,
                        meal: String(d.get("meal")),
                        date: String(d.get("date")),
                      }
                    : e,
                ),
              });
              setEditingEntryId(null);
            })}
          >
            <label>
              Название
              <input
                name="name"
                defaultValue={entry.name}
                maxLength={80}
                required
              />
            </label>
            <label>
              Приём пищи
              <Select name="meal" defaultValue={entry.meal}>
                <option>Завтрак</option>
                <option>Обед</option>
                <option>Ужин</option>
                <option>Перекус</option>
              </Select>
            </label>
            <label>
              Дата
              <input
                type="date"
                name="date"
                defaultValue={entry.date}
                required
              />
            </label>
            <button className="primary">Сохранить изменения</button>
          </form>
        </Modal>
      )}
      {batch && <PortionDialog key={batch.id} app={app} batch={batch} />}
    </>
  );
}
function PortionDialog({ app, batch }: { app: AppController; batch: Batch }) {
  const [unit, setUnit] = useState("servings");
  const [amount, setAmount] = useState(
    Math.min(1, batch.remainingFraction * batch.servings),
  );
  const fraction = unit === "servings" ? amount / batch.servings : amount / 100;
  return (
    <Modal title="Сколько съел?" onClose={() => app.setPortionBatchId(null)}>
      <h3>{batch.recipeName}</h3>
      <p className="muted">
        Осталось{" "}
        {(batch.remainingFraction * batch.servings).toLocaleString("ru", {
          maximumFractionDigits: 2,
        })}{" "}
        из {batch.servings} равных порций.
      </p>
      <form
        onSubmit={app.form((d) => {
          app.commit(
            eat(
              app.state,
              batch.id,
              fraction,
              String(d.get("meal")),
              crypto.randomUUID(),
              String(d.get("date")),
            ),
          );
          app.setPortionBatchId(null);
          app.setMessage("Порция добавлена в дневник");
        })}
      >
        <label>
          Как указать количество
          <Select
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              setAmount(
                e.target.value === "servings"
                  ? Math.min(1, batch.remainingFraction * batch.servings)
                  : Math.min(25, batch.remainingFraction * 100),
              );
            }}
          >
            <option value="servings">Равные порции</option>
            <option value="percent">Процент всего блюда</option>
          </Select>
        </label>
        <label>
          {unit === "servings" ? "Количество порций" : "Доля блюда, %"}
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={
              unit === "servings"
                ? batch.remainingFraction * batch.servings
                : batch.remainingFraction * 100
            }
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </label>
        <Macros
          n={scale(
            batch.nutrients,
            Number.isFinite(fraction) ? Math.max(0, fraction) : 0,
          )}
        />
        <label>
          Приём пищи
          <Select name="meal">
            <option>Завтрак</option>
            <option>Обед</option>
            <option>Ужин</option>
            <option>Перекус</option>
          </Select>
        </label>
        <label>
          Дата
          <input type="date" name="date" defaultValue={localDate()} required />
        </label>
        <button className="primary">Записать порцию</button>
      </form>
    </Modal>
  );
}
