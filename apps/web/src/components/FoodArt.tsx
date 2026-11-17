import chickenPhoto from "../assets/chicken-pexels.jpg";
import omeletPhoto from "../assets/omelet-pexels.jpg";
import cottagePhoto from "../assets/cottage-real.jpg";
import porridgePhoto from "../assets/porridge-pexels.jpg";
export { FoodArt } from "./food-art/FoodArt";
const recipePhotos: Record<string, { url: string; alt: string }> = {
  "chicken-rice": { url: chickenPhoto, alt: "Курица с рисом и огурцами" },
  omelet: { url: omeletPhoto, alt: "Омлет с помидорами" },
  "omelet-cheese": { url: omeletPhoto, alt: "Омлет — вариант подачи" },
  "cottage-banana": { url: cottagePhoto, alt: "Творог с бананом" },
  porridge: { url: porridgePhoto, alt: "Овсянка с бананом" },
};
export function RecipeArt({ recipeId }: { recipeId: string }) {
  const photo = recipePhotos[recipeId] ?? recipePhotos.porridge;
  return (
    <img
      className="recipe-photo"
      src={photo.url}
      alt={photo.alt}
      loading="lazy"
    />
  );
}
