import { Clock3 } from "lucide-react";
import { expiringIngredients } from "../domain/recipeExpiry";
import type { Food, Ingredient, PantryItem } from "../domain/model";

export function RecipeExpiry({
  ingredients,
  pantry,
  catalog,
}: {
  ingredients: Ingredient[];
  pantry: PantryItem[];
  catalog: Food[];
}) {
  const soon = expiringIngredients(ingredients, pantry);
  if (!soon.length) return null;
  return (
    <span className="recipe-expiry">
      <span className="recipe-expiry-title">
        <Clock3 size={16} aria-hidden="true" />
        Срок годности заканчивается
      </span>
      <span className="recipe-expiry-products">
        {soon
          .map(
            (item) =>
              `${catalog.find((food) => food.id === item.foodId)?.name ?? item.foodId} — годен до ${new Date(item.date + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "long" })}`,
          )
          .join("; ")}
      </span>
    </span>
  );
}
