import type { CatalogMatch } from "../api/catalogProducts";
export function CatalogConfirmation({
  picked,
  confirmed,
  setConfirmed,
}: {
  picked: CatalogMatch;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
}) {
  return (
    <div className="catalog-confirm">
      <p>{picked.barcode ? `${picked.barcode} · ` : ""}КБЖУ на 100 г</p>
      <p>
        {picked.per100.kcal} ккал · Б {picked.per100.protein} · Ж{" "}
        {picked.per100.fat} · У {picked.per100.carbs}
      </p>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Продукт совпадает, значения указаны на 100 г
      </label>
      <a href={picked.source.url} target="_blank" rel="noreferrer">
        {picked.source.url.includes("5ka.ru/")
          ? "Пятёрочка · проверить источник"
          : "Open Food Facts · ODbL-1.0 · проверить источник"}
      </a>
    </div>
  );
}
