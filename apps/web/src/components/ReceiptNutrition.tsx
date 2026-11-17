import { useEffect, useRef, useState } from "react";
import { Search, LoaderCircle, Check } from "lucide-react";
import { fetchNutritionMatches } from "../api/nutritionMatches";
import { receiptDrafts, type ReceiptDraft } from "../domain/receipt";
import { nutritionName } from "../../../../shared/nutritionMatching";
import type { Food } from "../domain/model";
export function ReceiptNutrition({
  row,
  onChange,
  catalog,
}: {
  row: ReceiptDraft;
  onChange: (patch: Partial<ReceiptDraft>) => void;
  catalog: Food[];
}) {
  const [query, setQuery] = useState(row.name),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null),
    latest = useRef(row);
  latest.current = row;
  useEffect(() => () => pending.current?.abort(), []);
  const food = row.options.find((f) => f.id === row.foodId),
    candidate = row.recognized.candidates.find((c) => c.food.id === row.foodId);
  const options =
    nutritionName(query) === nutritionName(row.name)
      ? row.recognized.candidates
      : [];
  async function search() {
    if (!query.trim()) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const candidates = await fetchNutritionMatches(
        query.trim(),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const current = latest.current,
        recognized = { ...current.recognized, name: query.trim(), candidates };
      const next = receiptDrafts([recognized], catalog)[0];
      onChange({
        ...next,
        grams: current.grams,
        selected: current.selected,
        nutrition: current.nutrition,
      });
    } catch (err) {
      if (!controller.signal.aborted) setError((err as Error).message);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <details
      className="receipt-product-details"
      open={
        !row.foodId ||
        row.foodId === "custom" ||
        Boolean(candidate?.needsUnitConfirmation && !row.unitConfirmed)
      }
    >
      <summary>
        {food
          ? `${food.name} · ${Math.round(food.per100.kcal)} ккал / 100 г`
          : "Найти КБЖУ в базе"}
      </summary>
      {food && (
        <div className="receipt-nutrition">
          <span>
            {candidate?.kind === "label"
              ? "Из базы продуктов"
              : candidate?.kind === "saved"
                ? "Сохранённые значения"
                : "Типовые значения"}
          </span>
          <strong>
            {food.per100.kcal} ккал · Б {food.per100.protein} · Ж{" "}
            {food.per100.fat} · У {food.per100.carbs}
          </strong>
          <small>На 100 г</small>
        </div>
      )}
      {candidate?.needsUnitConfirmation && (
        <label className="checkbox receipt-unit-confirm">
          <input
            type="checkbox"
            checked={row.unitConfirmed}
            onChange={(e) => onChange({ unitConfirmed: e.target.checked })}
          />
          На упаковке эти значения указаны на 100 г
        </label>
      )}
      {candidate?.sourceUrl && (
        <a
          className="receipt-source"
          href={candidate.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open Food Facts · ODbL
        </a>
      )}
      <label className="receipt-match-search">
        <span>Название или бренд</span>
        <span className="receipt-match-control">
          <input
            aria-label={`Найти КБЖУ: ${row.name}`}
            value={query}
            maxLength={160}
            onChange={(e) => {
              pending.current?.abort();
              pending.current = null;
              setBusy(false);
              setQuery(e.target.value);
              setError("");
            }}
          />
          <button
            type="button"
            aria-label={`Искать в базе: ${row.name}`}
            disabled={busy || !query.trim()}
            onClick={() => void search()}
          >
            {busy ? (
              <LoaderCircle className="ai-spinner" size={18} />
            ) : (
              <Search size={18} />
            )}
          </button>
        </span>
      </label>
      {error && (
        <p className="receipt-hint" role="status">
          {error}
        </p>
      )}
      {!!options.length && (
        <div className="receipt-match-options">
          {options.map((c) => (
            <button
              key={c.food.id}
              type="button"
              className={c.food.id === row.foodId ? "selected" : ""}
              onClick={() =>
                onChange({
                  foodId: c.food.id,
                  source: c.kind,
                  unitConfirmed: false,
                })
              }
            >
              <span>
                <strong>{c.food.name}</strong>
                <small>
                  {c.kind === "generic" ? "Типовые · " : ""}
                  {Math.round(c.food.per100.kcal)} ккал / 100 г
                </small>
              </span>
              {c.food.id === row.foodId && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
      {!food && !options.length && row.foodId !== "custom" && (
        <p className="receipt-hint">Совпадения не найдены.</p>
      )}
      {row.foodId !== "custom" && (
        <button
          type="button"
          className="text-button receipt-manual-nutrition"
          onClick={() => onChange({ foodId: "custom", source: "custom" })}
        >
          Нет подходящего — ввести с упаковки
        </button>
      )}
      {row.foodId === "custom" && (
        <>
          <label>
            Название
            <input
              aria-label={`Название продукта: ${row.id}`}
              value={row.name}
              maxLength={160}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </label>
          <div className="fields receipt-custom-nutrition">
            {(
              [
                ["kcal", "Ккал"],
                ["protein", "Белки, г"],
                ["fat", "Жиры, г"],
                ["carbs", "Углеводы, г"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label} на 100 г
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={row.nutrition[key]}
                  onChange={(e) =>
                    onChange({
                      nutrition: { ...row.nutrition, [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </>
      )}
    </details>
  );
}
