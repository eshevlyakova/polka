import { photoCredits } from "../data/photoCredits";
export function PhotoCredits({ recipeId }: { recipeId?: string }) {
  const list = recipeId
    ? photoCredits.filter((p) => p.recipeId === recipeId)
    : photoCredits;
  return (
    <div className="photo-credits">
      {list.map((p) => (
        <p key={p.recipeId}>
          <a href={p.source} target="_blank" rel="noreferrer">
            {p.title} · {p.author}
          </a>{" "}
          ·{" "}
          <a href={p.licenseUrl} target="_blank" rel="noreferrer">
            {p.license}
          </a>
        </p>
      ))}
      <p>
        Фотографии иллюстрируют подачу; ингредиенты могут отличаться. Файлы не
        изменены, в карточках показан фрагмент.
      </p>
    </div>
  );
}
