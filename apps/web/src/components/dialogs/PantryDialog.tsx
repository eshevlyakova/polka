import { useEffect, useState } from "react";
import { Search, Check, ArrowLeft } from "lucide-react";
import { Select } from "../Select";
import { FoodArt } from "../FoodArt";
import { Modal } from "../ui";
import { foodMeasures } from "../../domain/measures";
import {
  searchCatalogProducts,
  type CatalogMatch,
} from "../../api/catalogProducts";
import type { Food } from "../../domain/model";
import type { AppController } from "../../hooks/useAppController";
const normalize = (s: string) => s.toLocaleLowerCase("ru").replace(/ё/g, "е");
export function PantryDialog({ app }: { app: AppController }) {
  return app.modal === "pantry" ? <PantryForm app={app} /> : null;
}
function PantryForm({ app }: { app: AppController }) {
  const [query, setQuery] = useState("");
  const [food, setFood] = useState<Food | undefined>(
    app.catalog.find((f) => f.id === app.pantryFoodId),
  );
  const [remote, setRemote] = useState<CatalogMatch[]>([]);
  const [picked, setPicked] = useState<CatalogMatch | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(food?.id === "egg" ? "piece" : "g");
  const measures = foodMeasures(food),
    measure = measures.find((m) => m.id === unit) ?? measures[0];
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const local = app.catalog
    .filter((f) => terms.every((t) => normalize(f.name).includes(t)))
    .slice(0, 8);
  useEffect(() => {
    setRemote([]);
    setSearchError("");
    setBusy(false);
    if (query.trim().length < 2 || food) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const matches = await searchCatalogProducts(
          query.trim(),
          controller.signal,
        );
        if (!controller.signal.aborted) setRemote(matches);
      } catch (err) {
        if (!controller.signal.aborted) setSearchError((err as Error).message);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, food]);
  function choose(next: Food, candidate: CatalogMatch | null = null) {
    setFood(next);
    setPicked(candidate);
    setConfirmed(false);
    setError("");
    setUnit(next.id === "egg" ? "piece" : "g");
  }
  return (
    <Modal title="Добавить на полку" onClose={() => app.setModal(null)}>
      {!food ? (
        <section className="product-search">
          <label className="product-search-field">
            <Search size={19} />
            <input
              type="search"
              aria-label="Поиск продукта"
              placeholder="Название или бренд"
              value={query}
              maxLength={100}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className="product-search-caption">
            {query.trim()
              ? "Результаты поиска"
              : "Типовые продукты — или начни вводить название"}
          </p>
          <div className="product-search-results">
            {local.map((f) => (
              <button key={f.id} type="button" onClick={() => choose(f)}>
                <FoodArt foodId={f.id} name={f.name} />
                <span>
                  <strong>{f.name}</strong>
                  <small>
                    Типовой продукт · {Math.round(f.per100.kcal)} ккал / 100 г
                  </small>
                </span>
              </button>
            ))}
            {remote
              .filter((p) => !app.catalog.some((f) => f.id === p.id))
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    choose(
                      {
                        id: p.id,
                        name: [p.name, p.brand].filter(Boolean).join(" · "),
                        emoji: "",
                        per100: p.per100,
                      },
                      p,
                    )
                  }
                >
                  <FoodArt foodId={p.id} name={p.name} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.brand || "Из общей базы"} · {p.barcode}
                    </small>
                  </span>
                </button>
              ))}
          </div>
          {busy && (
            <p className="product-search-caption" role="status">
              Ищем в общей базе…
            </p>
          )}
          {!local.length && !remote.length && !busy && (
            <p className="product-search-caption">
              Ничего не найдено. Попробуй другое название или добавь свой
              продукт.
            </p>
          )}
          {searchError && (
            <p className="product-search-caption" role="status">
              {searchError}
            </p>
          )}
          <button
            type="button"
            className="text-button pantry-new-food"
            onClick={() => app.setModal("catalog")}
          >
            Не нашёл продукт? Добавить новый
          </button>
          {!!remote.length && (
            <a
              className="catalog-attribution"
              href="https://world.openfoodfacts.org/"
              target="_blank"
              rel="noreferrer"
            >
              Open Food Facts · ODbL-1.0
            </a>
          )}
        </section>
      ) : (
        <form
          className="pantry-quantity-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const grams = Number(quantity) * measure.grams;
              if (!Number.isFinite(grams) || grams <= 0 || grams > 100000)
                throw new Error(
                  "Укажи количество больше нуля, не более 100 кг.",
                );
              if (picked && !confirmed)
                throw new Error(
                  "Проверь совпадение упаковки и значения на 100 г.",
                );
              await app.commit({
                ...app.state,
                customFoods: app.catalog.some((f) => f.id === food.id)
                  ? app.state.customFoods
                  : [...app.state.customFoods, food],
                pantry: [
                  ...app.state.pantry,
                  {
                    id: crypto.randomUUID(),
                    foodId: food.id,
                    grams,
                    expiresOn: "",
                    addedAt: new Date().toISOString(),
                  },
                ],
              });
              app.setModal(null);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <button
            type="button"
            className="text-button product-change"
            onClick={() => {
              setFood(undefined);
              setPicked(null);
            }}
          >
            <ArrowLeft size={15} />
            Другой продукт
          </button>
          <div className="selected-product">
            <FoodArt foodId={food.id} name={food.name} />
            <div>
              <strong>{food.name}</strong>
              <small>{Math.round(food.per100.kcal)} ккал / 100 г</small>
            </div>
            <Check size={19} />
          </div>
          {picked && (
            <div className="catalog-confirm">
              <p>
                {picked.barcode} · {picked.basis}
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Упаковка совпадает, значения указаны на 100 г
              </label>
              <a href={picked.source.url} target="_blank" rel="noreferrer">
                Open Food Facts · ODbL-1.0 · проверить источник
              </a>
            </div>
          )}
          <label htmlFor="pantry-quantity">Сколько добавим?</label>
          <div className="intake-amount-control">
            <input
              id="pantry-quantity"
              aria-label={`Количество, ${measure.label}`}
              type="number"
              inputMode="decimal"
              step="any"
              min="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={unit === "piece" ? "Например, 6" : "Например, 400"}
            />
            <Select
              aria-label="Единица количества"
              value={measure.id}
              onChange={(e) => {
                const next = measures.find((m) => m.id === e.target.value)!;
                if (quantity)
                  setQuantity(
                    String(
                      Number(
                        (
                          (Number(quantity) * measure.grams) /
                          next.grams
                        ).toFixed(4),
                      ),
                    ),
                  );
                setUnit(next.id);
              }}
            >
              {measures.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button className="primary">Сохранить продукт</button>
        </form>
      )}
    </Modal>
  );
}
