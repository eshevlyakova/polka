import { catalogFood, type CatalogMatch } from "../api/catalogProducts";
import { useState } from "react";
import { Search, Check, ChevronRight } from "lucide-react";
import { FoodArt } from "./FoodArt";
import type { Food } from "../domain/model";

/** Short searchable list; never renders an entire product catalog as a dropdown. */
export function FoodPicker({
  foods,
  remote,
  searching,
  searchError,
  selected,
  onSelect,
  stock,
  query,
  onQuery,
  onReselect,
}: {
  foods: Food[];
  remote: CatalogMatch[];
  searching: boolean;
  searchError: string;
  query: string;
  onQuery: (query: string) => void;
  onReselect: () => void;
  selected?: Food;
  onSelect: (food: Food, match?: CatalogMatch) => void;
  stock?: (id: string) => number;
}) {
  const [choosing, setChoosing] = useState(!selected);
  const terms = query
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const matches = foods
    .filter((food) =>
      terms.every((term) =>
        food.name.toLocaleLowerCase("ru").replace(/ё/g, "е").includes(term),
      ),
    )
    .slice(0, 6);
  return (
    <div className="food-picker">
      {selected && !choosing ? (
        <button
          type="button"
          className="food-picker-selected"
          aria-label={`Выбран ${selected.name}. Изменить продукт`}
          onClick={() => {
            setChoosing(true);
            onReselect();
          }}
        >
          <FoodArt foodId={selected.id} name={selected.name} />
          <span>
            <strong>{selected.name}</strong>
            <small>
              {stock
                ? `${stock(selected.id).toLocaleString("ru")} г на полке`
                : `${Math.round(selected.per100.kcal)} ккал / 100 г`}
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
      ) : (
        <>
          <label className="product-search-field">
            <Search size={19} />
            <input
              type="search"
              aria-label="Найти еду"
              placeholder="Что ты съел?"
              maxLength={100}
              value={query}
              onChange={(e) => {
                onQuery(e.target.value);
              }}
            />
          </label>
          <div className="food-picker-results">
            {matches.map((food) => (
              <button
                type="button"
                key={food.id}
                onClick={() => {
                  onSelect(food);
                  setChoosing(false);
                }}
              >
                <FoodArt foodId={food.id} name={food.name} />
                <span>
                  <strong>{food.name}</strong>
                  <small>
                    {stock
                      ? `${stock(food.id).toLocaleString("ru")} г на полке`
                      : `${Math.round(food.per100.kcal)} ккал / 100 г`}
                  </small>
                </span>
                {food.id === selected?.id && <Check size={18} />}
              </button>
            ))}
            {remote.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => {
                  onSelect(catalogFood(p), p);
                  setChoosing(false);
                }}
              >
                <FoodArt foodId={p.id} name={p.name} />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.brand} · {p.per100.kcal} ккал / 100 г
                  </small>
                </span>
              </button>
            ))}
          </div>
          {searching && <p role="status">Ищем по названию и бренду…</p>}
          {searchError && <p role="status">{searchError}</p>}
          {!matches.length && !remote.length && !searching && !searchError && (
            <p className="product-search-caption">Не нашли в списке.</p>
          )}
        </>
      )}
    </div>
  );
}
