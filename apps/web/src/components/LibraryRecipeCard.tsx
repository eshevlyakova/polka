import { Clock3, ArrowUpRight, ShoppingBasket } from "lucide-react";
import { RecipeRating } from "./RecipeRating";
import type { RecipeFeedback } from "../../../../shared/model";
import {
  libraryCategories,
  type LibraryCard,
} from "../../../../shared/recipeLibrary";
export function LibraryRecipeCard({
  recipe,
  onOpen,
  onRate,
  disabled,
  leaving = false,
}: {
  recipe: LibraryCard;
  onOpen: (recipe: LibraryCard) => void;
  onRate?: (rating: RecipeFeedback["rating"]) => void;
  disabled?: boolean;
  leaving?: boolean;
}) {
  return (
    <article
      className={`rated-recipe-card ${leaving ? "is-dismissing" : ""}`}
      inert={leaving || undefined}
      aria-hidden={leaving || undefined}
    >
      <button
        type="button"
        className="library-card"
        onClick={() => onOpen(recipe)}
      >
        <span className="library-card-meta">
          <span>{libraryCategories[recipe.category] ?? "Рецепт"}</span>
          <span>
            <Clock3 size={13} />
            {recipe.minutes === null
              ? "Время не указано"
              : `${recipe.minutes} мин`}
          </span>
        </span>
        <strong>{recipe.name}</strong>
        <p>{recipe.summary}</p>
        <span className="library-card-footer">
          <span>
            {recipe.perServing
              ? `${Math.round(recipe.perServing.kcal)} ккал / порция`
              : "КБЖУ — после подготовки"}
          </span>
          <ArrowUpRight size={20} />
        </span>
        {recipe.stockMatches > 0 && (
          <span className="library-stock">
            <ShoppingBasket size={13} />
            На полке: {recipe.stockMatches} из {recipe.ingredients.length}{" "}
            ингредиентов
          </span>
        )}
      </button>
      {onRate && (
        <RecipeRating name={recipe.name} disabled={disabled} onRate={onRate} />
      )}
    </article>
  );
}
