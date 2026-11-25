import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { RecipeFeedback } from "../../../../shared/model";
export function RecipeRating({
  name,
  disabled,
  onRate,
}: {
  name: string;
  disabled?: boolean;
  onRate: (rating: RecipeFeedback["rating"]) => void;
}) {
  return (
    <div
      className="recipe-rating"
      role="group"
      aria-label={`Оценить рецепт «${name}»`}
    >
      <button type="button" disabled={disabled} onClick={() => onRate("like")}>
        <ThumbsUp size={17} />
        <span>Нравится</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRate("dislike")}
      >
        <ThumbsDown size={17} />
        <span>Не моё</span>
      </button>
    </div>
  );
}
