import { Trash2 } from "lucide-react";
import { ReceiptNutrition } from "./ReceiptNutrition";
import type { ReceiptDraft } from "../domain/receipt";
import type { Food } from "../domain/model";
import type { Dispatch, SetStateAction } from "react";
const units: Record<string, string> = {
  g: "г",
  kg: "кг",
  ml: "мл",
  l: "л",
  pcs: "шт.",
};
export function ReceiptReview({
  rows,
  onChange,
  catalog,
}: {
  rows: ReceiptDraft[];
  onChange: Dispatch<SetStateAction<ReceiptDraft[] | null>>;
  catalog: Food[];
}) {
  const update = (id: string, value: Partial<ReceiptDraft>) =>
    onChange(
      (current) =>
        current?.map((r) => (r.id === id ? { ...r, ...value } : r)) ?? current,
    );
  return (
    <div className="receipt-review">
      {rows.map((row, index) => {
        const recognized = row.recognized;
        return (
          <article
            className={`receipt-row ${!row.selected ? "receipt-row-skipped" : ""}`}
            key={row.id}
          >
            <div className="receipt-row-heading">
              <label className="checkbox receipt-include">
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(e) =>
                    update(row.id, { selected: e.target.checked })
                  }
                  aria-label={`Добавить ${row.name}`}
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </label>
              <strong>{row.name}</strong>
              <button
                className="icon-button"
                aria-label={`Убрать ${row.name} из чека`}
                onClick={() =>
                  onChange(
                    (current) =>
                      current?.filter((r) => r.id !== row.id) ?? current,
                  )
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
            {row.selected && (
              <>
                <label className="receipt-mass">
                  Масса, г
                  <input
                    inputMode="decimal"
                    type="number"
                    min="0.1"
                    step="0.1"
                    max="100000"
                    placeholder="Уточни количество"
                    value={row.grams}
                    onChange={(e) => update(row.id, { grams: e.target.value })}
                  />
                </label>
                {!row.grams && (
                  <p className="receipt-hint">
                    {recognized.quantity !== null
                      ? `В чеке: ${recognized.quantity.toLocaleString("ru")} ${units[recognized.unit ?? ""] ?? ""}. `
                      : ""}
                    Уточни массу.
                  </p>
                )}
                <ReceiptNutrition
                  row={row}
                  catalog={catalog}
                  onChange={(patch) => update(row.id, patch)}
                />
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
