import { useState } from "react";
import { validNutrition } from "../../../../../shared/nutritionMatching";
import { inputNumber } from "../../domain/input";
import type { Food } from "../../domain/model";
import type { AppController } from "../../hooks/useAppController";

export function CustomFoodForm({
  app,
  onCreated,
  initialName = "",
}: {
  app: AppController;
  onCreated: (food: Food) => void;
  initialName?: string;
}) {
  const [error, setError] = useState("");
  return (
    <form
      className="custom-food-form"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const data = new FormData(event.currentTarget);
          const name = String(data.get("name") ?? "").trim();
          if (!name) throw new Error("Укажи название");
          const food: Food = {
            id: crypto.randomUUID(),
            name,
            emoji: "🍽️",
            per100: {
              kcal: inputNumber(data, "kcal"),
              protein: inputNumber(data, "protein"),
              fat: inputNumber(data, "fat"),
              carbs: inputNumber(data, "carbs"),
            },
          };
          if (!validNutrition(food.per100))
            throw new Error(
              "Проверь значения на 100 г: до 950 ккал и до 100 г каждого макронутриента.",
            );
          await app.commit({
            ...app.state,
            customFoods: [...app.state.customFoods, food],
          });
          onCreated(food);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Не удалось сохранить продукт",
          );
        }
      }}
    >
      <label>
        Название
        <input
          name="name"
          defaultValue={initialName.slice(0, 80)}
          required
          maxLength={80}
          placeholder="Например, сырники из кафе"
        />
      </label>
      <p className="muted">
        КБЖУ на 100 г — с этикетки, из меню или по известному составу.
      </p>
      <div className="fields">
        {[
          ["kcal", "Ккал"],
          ["protein", "Белки, г"],
          ["fat", "Жиры, г"],
          ["carbs", "Углеводы, г"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              name={key}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max={key === "kcal" ? 950 : 100}
              required
            />
          </label>
        ))}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <button className="secondary">Сохранить в каталог</button>
    </form>
  );
}
