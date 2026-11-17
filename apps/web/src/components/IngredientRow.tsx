import { useState } from "react";
import { X } from "lucide-react";
import { Select } from "./Select";
import { FoodArt } from "./FoodArt";
import {
  defaultMeasure,
  foodMeasures,
  kitchenAmount,
} from "../domain/measures";
import { formatAmount } from "../domain/cooking";
import type { Food, Ingredient } from "../domain/model";
export function IngredientRow({
  item,
  catalog,
  editing,
  available,
  onChange,
  onRemove,
}: {
  item: Ingredient;
  catalog: Food[];
  editing: boolean;
  available: number;
  onChange: (value: Ingredient) => void;
  onRemove: () => void;
}) {
  const food = catalog.find((f) => f.id === item.foodId);
  const measures = foodMeasures(food);
  const [unit, setUnit] = useState(defaultMeasure(food, item.grams).id);
  const measure = measures.find((m) => m.id === unit) ?? measures[0];
  return (
    <div className={`recipe-ingredient-row ${editing ? "editing" : ""}`}>
      <FoodArt foodId={item.foodId} name={food?.name} />
      <div className="recipe-ingredient-name">
        {editing ? (
          <Select
            aria-label="Ингредиент"
            value={item.foodId}
            onChange={(e) => {
              onChange({ ...item, foodId: e.target.value });
              setUnit("g");
            }}
          >
            {catalog.map((f) => (
              <option value={f.id} key={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        ) : (
          <strong>{food?.name ?? item.foodId}</strong>
        )}
        {available + 1e-6 < item.grams && (
          <small className="ingredient-shortage">
            Не хватает {formatAmount(item.grams - available)} г
          </small>
        )}
      </div>
      {editing ? (
        <div className="ingredient-quantity">
          <input
            aria-label={`Количество: ${food?.name}`}
            type="number"
            inputMode="decimal"
            min="0.001"
            step="any"
            value={
              item.grams > 0
                ? Number((item.grams / measure.grams).toFixed(4))
                : ""
            }
            onChange={(e) =>
              onChange({
                ...item,
                grams: Number(e.target.value) * measure.grams,
              })
            }
          />
          <Select
            aria-label={`Единица: ${food?.name}`}
            value={measure.id}
            onChange={(e) => setUnit(e.target.value)}
          >
            {measures.map((m) => (
              <option value={m.id} key={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
          <button
            className="icon-button"
            aria-label={`Убрать ${food?.name}`}
            onClick={onRemove}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="ingredient-measure">
          <strong>{kitchenAmount(item.grams, measure)}</strong>
          {measure.approximate && <small>≈ {formatAmount(item.grams)} г</small>}
        </div>
      )}
    </div>
  );
}
