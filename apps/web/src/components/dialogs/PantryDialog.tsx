import { useCatalogLookup } from "../../hooks/useCatalogLookup";
import { CatalogConfirmation } from "../CatalogConfirmation";
import { useState } from "react";
import { Search, Check } from "lucide-react";
import { Select } from "../Select";
import { FoodArt } from "../FoodArt";
import { CustomFoodForm } from "./CustomFoodForm";
import { Modal } from "../ui";
import { foodMeasures } from "../../domain/measures";
import { catalogFood, type CatalogMatch } from "../../api/catalogProducts";
import type { Food } from "../../domain/model";
import type { AppController } from "../../hooks/useAppController";
const normalize = (s: string) => s.toLocaleLowerCase("ru").replace(/ё/g, "е");
export function PantryDialog({ app }: { app: AppController }) {
  return app.modal === "pantry" ? <PantryForm app={app} /> : null;
}
function PantryForm({ app }: { app: AppController }) {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [food, setFood] = useState<Food | undefined>(
    app.catalog.find((f) => f.id === app.pantryFoodId),
  );
  const { remote, busy, searchError } = useCatalogLookup(
    query,
    !creating && !food,
  );
  const [picked, setPicked] = useState<CatalogMatch | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(food?.id === "egg" ? "piece" : "g");
  const measures = foodMeasures(food),
    measure = measures.find((m) => m.id === unit) ?? measures[0];
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const local = app.catalog
    .filter((f) => terms.every((t) => normalize(f.name).includes(t)))
    .slice(0, 8);
  function choose(next: Food, candidate: CatalogMatch | null = null) {
    setQuantity("");
    setFood(next);
    setPicked(candidate);
    setConfirmed(false);
    setError("");
    setUnit(next.id === "egg" ? "piece" : "g");
  }
  return (
    <Modal
      title={creating ? "Новый продукт" : "Добавить на полку"}
      onClose={() => app.setModal(null)}
      onBack={() => {
        if (creating) setCreating(false);
        else if (food && !app.pantryFoodId) {
          setFood(undefined);
          setPicked(null);
        } else if (app.pantryFoodId) app.setModal(null);
        else app.setModal("add-pantry");
      }}
    >
      {creating ? (
        <CustomFoodForm
          app={app}
          initialName={query.trim()}
          onCreated={(created) => {
            setCreating(false);
            choose(created);
          }}
        />
      ) : !food ? (
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
            {query.trim() ? "Результаты поиска" : "Продукты"}
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
                  onClick={() => choose(catalogFood(p), p)}
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
            onClick={() => setCreating(true)}
          >
            Не нашёл продукт? Добавить новый
          </button>
          {remote.some((p) => p.source.url.includes("openfoodfacts.org")) && (
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
              app.finishAddingProducts();
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <div className="selected-product">
            <FoodArt foodId={food.id} name={food.name} />
            <div>
              <strong>{food.name}</strong>
              <small>{Math.round(food.per100.kcal)} ккал / 100 г</small>
            </div>
            <Check size={19} />
          </div>
          {picked && (
            <CatalogConfirmation
              picked={picked}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
            />
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
          <div
            className="quantity-presets"
            aria-label="Быстро указать количество"
          >
            {(measure.id === "g" ? [200, 400, 500] : [1, 2, 6]).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={quantity === String(n)}
                onClick={() => setQuantity(String(n))}
              >
                {n} {measure.label}
              </button>
            ))}
          </div>
          {measure.approximate && quantity && (
            <p className="intake-measure-note">
              ≈{" "}
              {Math.round(Number(quantity) * measure.grams).toLocaleString(
                "ru",
              )}{" "}
              г
            </p>
          )}
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
