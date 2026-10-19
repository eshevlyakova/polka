import { useState } from "react";
import { Archive, ChefHat, Utensils } from "lucide-react";
import { Select } from "../Select";
import { Empty, Macros, Modal } from "../ui";
import { scale } from "../../domain/nutrition";
import { recordIntake, type IntakeSource } from "../../domain/intake";
import { CustomFoodForm } from "./CustomFoodForm";
import { MealFields } from "./MealFields";
import { PortionFields, type PortionUnit } from "./PortionFields";
import type { AppController } from "../../hooks/useAppController";

export function FoodDialog({ app }: { app: AppController }) {
  return app.modal === "food" ? <IntakeForm app={app} /> : null;
}
function IntakeForm({ app }: { app: AppController }) {
  const { state, catalog, foodContext } = app;
  const [source, setSource] = useState<IntakeSource>(foodContext.source);
  const [query, setQuery] = useState("");
  const [foodId, setFoodId] = useState(foodContext.itemId ?? "");
  const [batchId, setBatchId] = useState(foodContext.itemId ?? "");
  const [grams, setGrams] = useState("");
  const [unit, setUnit] = useState<PortionUnit>("servings");
  const batches = state.batches.filter((item) => item.remainingFraction > 1e-6);
  const batch = batches.find((item) => item.id === batchId) ?? batches[0];
  const [amount, setAmount] = useState(
    String(batch ? Math.min(1, batch.remainingFraction * batch.servings) : 1),
  );
  const [approximate, setApproximate] = useState(source === "other");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const options = catalog.filter(
    (food) =>
      (source !== "pantry" || app.available(food.id) > 0) &&
      food.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const food = options.find((item) => item.id === foodId) ?? options[0];
  const fraction =
    unit === "servings"
      ? Number(amount) / (batch?.servings ?? 1)
      : Number(amount) / 100;
  const validAmount =
    source === "prepared"
      ? Number.isFinite(fraction) && fraction > 0
      : Number.isFinite(Number(grams)) && Number(grams) > 0;
  const preview =
    source === "prepared" && batch
      ? scale(batch.nutrients, validAmount ? fraction : 0)
      : food
        ? scale(food.per100, validAmount ? Number(grams) / 100 : 0)
        : null;
  const canSubmit = source === "prepared" ? !!batch : !!food;
  function changeSource(next: IntakeSource) {
    setSource(next);
    setQuery("");
    setCreating(false);
    setError("");
    setApproximate(next === "other");
  }
  function chooseBatch(id: string) {
    setBatchId(id);
    const next = batches.find((item) => item.id === id);
    if (next)
      setAmount(
        String(
          unit === "servings"
            ? Math.min(1, next.remainingFraction * next.servings)
            : Math.min(25, next.remainingFraction * 100),
        ),
      );
  }
  return (
    <Modal title="Что ты съел?" onClose={() => app.setModal(null)}>
      <div className="intake-sources" role="group" aria-label="Откуда еда">
        {(
          [
            ["pantry", Archive, "С полки"],
            ["prepared", ChefHat, "Готовая еда"],
            ["other", Utensils, "Другая еда"],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={source === key}
            onClick={() => changeSource(key)}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
      </div>
      <p className="muted intake-description">
        {source === "pantry"
          ? "Продукт с твоей полки, который ты съел отдельно."
          : source === "prepared"
            ? "Блюдо, которое ты уже приготовил. Можно записать часть, а остальное оставить на потом."
            : "Кафе, доставка или любой продукт, которого нет на твоей полке."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const data = new FormData(event.currentTarget);
            const context = {
              meal: String(data.get("meal") ?? ""),
              date: String(data.get("date") ?? ""),
            };
            const intake =
              source === "prepared"
                ? { ...context, source, batchId: batch?.id ?? "", fraction }
                : {
                    ...context,
                    source,
                    foodId: food?.id ?? "",
                    grams: Number(grams),
                    approximate,
                  };
            app.commit(
              recordIntake(state, intake, catalog, crypto.randomUUID()),
            );
            app.setModal(null);
            app.setError("");
            app.setMessage("Приём пищи записан");
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Не удалось сохранить запись",
            );
          }
        }}
      >
        {source === "prepared" ? (
          batch ? (
            <>
              <label>
                Готовое блюдо
                <Select
                  aria-label="Готовое блюдо"
                  value={batch.id}
                  onChange={(event) => chooseBatch(event.target.value)}
                >
                  {batches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.recipeName}
                    </option>
                  ))}
                </Select>
              </label>
              <PortionFields
                batch={batch}
                unit={unit}
                amount={amount}
                onAmount={setAmount}
                onUnit={(next) => {
                  const converted =
                    next === "percent"
                      ? fraction * 100
                      : fraction * batch.servings;
                  const maximum =
                    next === "percent"
                      ? batch.remainingFraction * 100
                      : batch.remainingFraction * batch.servings;
                  setAmount(
                    String(Math.min(maximum, Number(converted.toFixed(6)))),
                  );
                  setUnit(next);
                }}
              />
            </>
          ) : (
            <Empty>
              Пока нет готовой еды. Приготовь блюдо — его остаток появится
              здесь.
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  app.setModal(null);
                  app.setRecipeFoodId(null);
                  app.setTab("recipes");
                }}
              >
                Выбрать рецепт
              </button>
            </Empty>
          )
        ) : (
          <>
            <label>
              Поиск
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Продукт или блюдо"
              />
            </label>
            {food ? (
              <>
                <label>
                  {source === "pantry"
                    ? "Продукт с полки"
                    : "Продукт или блюдо"}
                  <Select
                    value={food.id}
                    onChange={(event) => setFoodId(event.target.value)}
                  >
                    {options.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </label>
                {source === "pantry" && (
                  <p className="intake-stock">
                    На полке: {app.available(food.id).toLocaleString("ru")} г
                  </p>
                )}
                <label>
                  Количество, г
                  <input
                    name="grams"
                    type="number"
                    inputMode="decimal"
                    min="0.1"
                    step="0.1"
                    value={grams}
                    onChange={(event) => setGrams(event.target.value)}
                    max={
                      source === "pantry" ? app.available(food.id) : undefined
                    }
                    required
                  />
                </label>
              </>
            ) : (
              <Empty>
                {source === "pantry"
                  ? "На полке нет продуктов по этому запросу. Проверь поиск или выбери «Другая еда»."
                  : "Не нашли такую позицию. Добавь свой продукт или блюдо ниже."}
              </Empty>
            )}
          </>
        )}
        {canSubmit && (
          <>
            {preview && (
              <div className="intake-preview">
                <span className="intake-preview-label">
                  КБЖУ съеденной части
                </span>
                <Macros n={preview} />
              </div>
            )}
            <MealFields meal={foodContext.meal} date={foodContext.date} />
            {source !== "prepared" && (
              <label className="checkbox">
                <input
                  name="approximate"
                  type="checkbox"
                  checked={approximate}
                  onChange={(event) => setApproximate(event.target.checked)}
                />
                Приблизительная запись
              </label>
            )}
            <p className="intake-impact">
              {source === "pantry"
                ? `С полки спишется ${Number(grams) > 0 ? Number(grams).toLocaleString("ru") : "указанное количество"}${Number(grams) > 0 ? " г" : ""} продукта.`
                : source === "prepared"
                  ? "Уменьшится только остаток блюда. Ингредиенты уже списаны при приготовлении."
                  : "Запись появится в дневнике. Запасы на полке не изменятся."}
            </p>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button className="primary">Добавить в дневник</button>
          </>
        )}
      </form>
      {source === "other" && (
        <section className="intake-custom">
          <button
            type="button"
            className="text-button"
            aria-expanded={creating}
            onClick={() => setCreating(!creating)}
          >
            {creating ? "Скрыть форму" : "Нет в списке — добавить своё"}
          </button>
          {creating && (
            <CustomFoodForm
              app={app}
              onCreated={(created) => {
                setFoodId(created.id);
                setQuery("");
                setCreating(false);
                setError("");
              }}
            />
          )}
        </section>
      )}
    </Modal>
  );
}
