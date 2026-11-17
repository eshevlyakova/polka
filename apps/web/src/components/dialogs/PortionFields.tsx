import type { Batch } from "../../domain/model";
import { formatAmount, batchWeight, portionLabel } from "../../domain/cooking";
export type PortionUnit = "servings" | "percent" | "grams";
export function PortionFields({
  batch,
  unit,
  amount,
  onAmount,
  onUnit,
}: {
  batch: Batch;
  unit: PortionUnit;
  amount: string;
  onAmount: (value: string) => void;
  onUnit: (value: PortionUnit) => void;
}) {
  return (
    <>
      <p className="intake-stock">
        Осталось {formatAmount(batch.remainingFraction * batch.servings)} из{" "}
        {batch.servings} порций
      </p>
      <div className="portion-modes" aria-label="Как указать съеденное">
        {(
          [
            ["servings", "Порции"],
            ["percent", "% блюда"],
            ...(batchWeight(batch) ? [["grams", "Граммы"]] : []),
          ] as [PortionUnit, string][]
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={unit === id}
            onClick={() => onUnit(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <label>
        {unit === "servings"
          ? "Количество порций"
          : unit === "grams"
            ? "Масса порции, г"
            : "Доля блюда, %"}
        <input
          type="number"
          inputMode="decimal"
          min="0.0001"
          step="any"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          required
        />
      </label>
      <p className="intake-measure-note">{portionLabel(batch)}</p>
    </>
  );
}
