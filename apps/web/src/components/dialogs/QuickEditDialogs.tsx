import { Select } from "../Select";
import { Modal } from "../ui";
import { inputNumber } from "../../domain/input";
import type { AppController } from "../../hooks/useAppController";
export function QuickEditDialogs({ app }: { app: AppController }) {
  const {
    state,
    editingPantryId,
    setEditingPantryId,
    editingEntryId,
    setEditingEntryId,
    commit,
    form,
    foodName,
  } = app;
  const product = state.pantry.find((p) => p.id === editingPantryId);
  const entry = state.diary.find((e) => e.id === editingEntryId);
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
    </>
  );
}
