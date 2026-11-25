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
      <div className="quantity-presets" aria-label="Быстро указать порцию">
        {(unit === "servings"
          ? [0.5, 1, 2]
          : unit === "grams"
            ? [100, 200, 300]
            : [25, 50, 100]
        ).map((n) => (
          <button
            type="button"
            key={n}
            disabled={
              (unit === "servings"
                ? n / batch.servings
                : unit === "grams"
                  ? n / batchWeight(batch)!
                  : n / 100) >
              batch.remainingFraction + 1e-6
            }
            aria-pressed={amount === String(n)}
            onClick={() => onAmount(String(n))}
          >
            {n.toLocaleString("ru")}{" "}
            {unit === "servings" ? "порц." : unit === "grams" ? "г" : "%"}
          </button>
        ))}
      </div>
      <p className="intake-measure-note">{portionLabel(batch)}</p>
    </>
  );
}
