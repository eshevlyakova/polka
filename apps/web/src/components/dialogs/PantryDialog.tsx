import { Select } from "../Select";
import { Modal } from "../../components/ui";
import { inputNumber } from "../../domain/input";

import type { AppController } from "../../hooks/useAppController";
export function PantryDialog({ app }: { app: AppController }) {
  const { state, commit, modal, setModal, catalog, form } = app;
  return (
    <>
      {modal === "pantry" && (
        <Modal title="Добавить на полку" onClose={() => setModal(null)}>
          <form
            onSubmit={form((d) => {
              const grams = inputNumber(d, "grams", 0.1);
              const foodId = String(d.get("foodId"));
              commit({
                ...state,
                pantry: [
                  ...state.pantry,
                  {
                    id: crypto.randomUUID(),
                    foodId,
                    grams,
                    expiresOn: String(d.get("expiresOn") || ""),
                  },
                ],
              });
              setModal(null);
            })}
          >
            <label>
              Продукт
              <Select name="foodId">
                {catalog.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Количество, г
              <input name="grams" type="number" min="0.1" step="0.1" required />
            </label>
            <label>
              Срок годности
              <input name="expiresOn" type="date" />
            </label>
            <p className="muted">
              Для яиц укажи массу съедобной части без скорлупы. Например, около
              50 г на яйцо.
            </p>
            <button className="primary">Сохранить продукт</button>
          </form>
        </Modal>
      )}
    </>
  );
}
