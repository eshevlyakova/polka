import { Clock3, ArrowUpRight, ShoppingBasket } from "lucide-react";
import {
  libraryCategories,
  type LibraryCard,
} from "../../../../shared/recipeLibrary";
export function LibraryRecipeCard({
  recipe,
  onOpen,
}: {
  recipe: LibraryCard;
  onOpen: (recipe: LibraryCard) => void;
}) {
  return (
    <button className="library-card" onClick={() => onOpen(recipe)}>
      <span className="library-card-meta">
        <span>{libraryCategories[recipe.category] ?? "Рецепт"}</span>
        <span>
          <Clock3 size={13} />
          {recipe.minutes} мин
        </span>
      </span>
      <strong>{recipe.name}</strong>
      <p>{recipe.summary}</p>
      <span className="library-card-footer">
        <span>{Math.round(recipe.perServing.kcal)} ккал / порция</span>
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
  );
}
