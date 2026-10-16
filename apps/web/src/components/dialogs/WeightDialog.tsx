import { useState } from "react";
import { Modal } from "../ui";
import { localDate } from "../../domain/model";
import { recordWeight } from "../../domain/weight";
import type { AppController } from "../../hooks/useAppController";
export function WeightDialog({ app }: { app: AppController }) {
  return app.modal === "weight" ? <WeightForm app={app} /> : null;
}
function WeightForm({ app }: { app: AppController }) {
  const [error, setError] = useState("");
  return (
    <Modal title="Записать вес" onClose={() => app.setModal(null)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const data = new FormData(event.currentTarget);
            const profile = recordWeight(
              app.state.profile ?? { name: "" },
              Number(String(data.get("kg")).replace(",", ".")),
              String(data.get("date")),
            );
            app.commit({ ...app.state, profile });
            app.setModal(null);
            app.setMessage("Вес записан");
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Не удалось сохранить вес",
            );
          }
        }}
      >
        <label>
          Вес, кг
          <input
            name="kg"
            type="number"
            inputMode="decimal"
            min="1"
            max="500"
            step="0.1"
            defaultValue={app.state.profile?.weightKg ?? ""}
            required
          />
        </label>
        <label>
          Дата измерения
          <input
            name="date"
            type="date"
            defaultValue={localDate()}
            max={localDate()}
            required
          />
        </label>
        <p className="muted">
          Новое значение за ту же дату заменит предыдущее.
        </p>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <button className="primary">Сохранить вес</button>
      </form>
    </Modal>
  );
}
