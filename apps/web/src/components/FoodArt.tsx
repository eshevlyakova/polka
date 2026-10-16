import chickenPhoto from "../assets/chicken-pexels.jpg";
import omeletPhoto from "../assets/omelet-pexels.jpg";
import cottagePhoto from "../assets/cottage-real.jpg";
import porridgePhoto from "../assets/porridge-pexels.jpg";
import { useId } from "react";
/** Small vector pantry illustrations; no external requests or emoji fonts. */
export function FoodArt({ foodId }: { foodId: string }) {
  const id = useId().replace(/:/g, "");
  const tomato = (
    <>
      <circle cx="28" cy="35" r="16" fill="#e86846" />
      <ellipse cx="23" cy="31" rx="5" ry="9" fill="#f18b63" />
      <path d="m28 20-7-7 9 3 7-5-3 9 7 4-10-1-5 5Z" fill="#4b7945" />
    </>
  );
  let art;
  switch (foodId) {
    case "tomato":
      art = (
        <>
          {tomato}
          <circle cx="42" cy="43" r="12" fill="#c84b35" />
          <path d="m42 31-5-4 6 1 5-4-1 6 5 3-8-1Z" fill="#4b7945" />
        </>
      );
      break;
    case "egg":
      art = (
        <>
          <ellipse
            cx="24"
            cy="34"
            rx="13"
            ry="19"
            fill="#ddac7d"
            transform="rotate(-20 24 34)"
          />
          <ellipse
            cx="41"
            cy="35"
            rx="13"
            ry="19"
            fill="#f3dbb7"
            transform="rotate(20 41 35)"
          />
          <path
            d="M38 20q-5 5-5 12"
            stroke="#fff1d7"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
      break;
    case "cucumber":
      art = (
        <>
          <path
            d="M16 47 43 17"
            stroke="#5f8c4d"
            strokeWidth="17"
            strokeLinecap="round"
          />
          <path
            d="M15 43 39 17"
            stroke="#91af62"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <ellipse
            cx="43"
            cy="18"
            rx="9"
            ry="7"
            transform="rotate(40 43 18)"
            fill="#ceda95"
          />
        </>
      );
      break;
    case "banana":
      art = (
        <>
          <path d="M17 17q-2 38 35 22-17 25-33 10Q5 37 14 17Z" fill="#edc85d" />
          <path
            d="M18 22q-1 30 30 21"
            stroke="#ffe9a1"
            strokeWidth="3"
            fill="none"
          />
          <path d="m14 17 1-5 5 1-2 6" fill="#6d7943" />
        </>
      );
      break;
    case "chicken":
      art = (
        <>
          <rect x="7" y="12" width="51" height="43" rx="9" fill="#e8e2cf" />
          <path
            d="M16 40q-7-16 9-20 19-8 27 13 3 12-13 13-15 8-23-6"
            fill="#e9b4a4"
          />
          <path
            d="M22 28q12-6 22 7"
            stroke="#f5d1bf"
            strokeWidth="4"
            fill="none"
          />
        </>
      );
      break;
    case "milk":
    case "yogurt":
      art = (
        <>
          <path
            d="M21 13h22l4 10v31H18V23Z"
            fill="#f8f7e9"
            stroke="#d4dccb"
            strokeWidth="2"
          />
          <path d="M21 13h22v-3H21" fill="#92b7bb" />
          <rect x="18" y="27" width="29" height="17" fill="#9db9a0" />
          <path d="M24 34h17" stroke="#f9faf0" strokeWidth="3" />
        </>
      );
      break;
    case "oil":
      art = (
        <>
          <rect x="25" y="9" width="14" height="8" rx="2" fill="#577543" />
          <path d="M25 17h14v9l7 6v22H18V32l7-6Z" fill="#d1c782" />
          <rect x="18" y="36" width="28" height="15" fill="#f4e3aa" />
          <path d="M28 40q9-5 9 6-9 3-9-6" fill="#739151" />
        </>
      );
      break;
    case "cottage":
      art = (
        <>
          <ellipse cx="32" cy="29" rx="24" ry="12" fill="#e4decf" />
          <path d="M8 29q2 25 24 25t24-25" fill="#bcc9b4" />
          <ellipse cx="32" cy="29" rx="20" ry="9" fill="#fff9e9" />
          <g fill="#eee3cc">
            <circle cx="23" cy="27" r="3" />
            <circle cx="35" cy="25" r="4" />
            <circle cx="41" cy="31" r="3" />
            <circle cx="29" cy="32" r="3" />
          </g>
        </>
      );
      break;
    default:
      art = (
        <>
          <rect x="15" y="13" width="34" height="43" rx="8" fill="#d9cba8" />
          <rect x="14" y="9" width="36" height="8" rx="3" fill="#79916b" />
          <rect x="20" y="26" width="24" height="19" rx="4" fill="#faf2da" />
          <path
            d="m25 33 4 3m7-6 3 3m-8 6 4 1"
            stroke="#c8ac65"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
  }
  return (
    <svg className="food-art" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id={id}>
          <stop stopColor="#faf7ed" />
          <stop offset="1" stopColor="#eae8dc" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id})`} />
      <ellipse cx="32" cy="56" rx="21" ry="3" fill="#526344" opacity=".08" />
      {art}
    </svg>
  );
}
const recipePhotos: Record<string, { url: string; alt: string }> = {
  "chicken-rice": { url: chickenPhoto, alt: "Курица с рисом и огурцами" },
  omelet: { url: omeletPhoto, alt: "Омлет с помидорами" },
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
