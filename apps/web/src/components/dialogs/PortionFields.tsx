import { Select } from "../Select";
import type { Batch } from "../../domain/model";
export type PortionUnit = "servings" | "percent";
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
        Осталось{" "}
        {(batch.remainingFraction * batch.servings).toLocaleString("ru", {
          maximumFractionDigits: 2,
        })}{" "}
        из {batch.servings} равных порций ·{" "}
        {Math.round(batch.remainingFraction * 100)}% блюда
      </p>
      <label>
        Как указать количество
        <Select
          value={unit}
          onChange={(event) => onUnit(event.target.value as PortionUnit)}
        >
          <option value="servings">Равные порции</option>
          <option value="percent">Процент всего блюда</option>
        </Select>
      </label>
      <label>
        {unit === "servings" ? "Количество порций" : "Доля блюда, %"}
        <input
          name="portion"
          type="number"
          inputMode="decimal"
          min="0.0001"
          step="any"
          max={
            unit === "servings"
              ? batch.remainingFraction * batch.servings
              : batch.remainingFraction * 100
          }
          value={amount}
          onChange={(event) => onAmount(event.target.value)}
          required
        />
      </label>
    </>
  );
}
