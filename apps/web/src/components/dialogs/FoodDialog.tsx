import { useCatalogLookup } from "../../hooks/useCatalogLookup";
import { catalogFood, type CatalogMatch } from "../../api/catalogProducts";
import { CatalogConfirmation } from "../CatalogConfirmation";
import { useState } from "react";
import { Archive, ChefHat, Utensils, ArrowRight } from "lucide-react";
import { FoodPicker } from "../FoodPicker";
import { Select } from "../Select";
import { Empty, Macros, Modal } from "../ui";
import { scale } from "../../domain/nutrition";
import { batchWeight } from "../../domain/cooking";
import { foodMeasures } from "../../domain/measures";
import { recordIntake, type IntakeSource } from "../../domain/intake";
import { CustomFoodForm } from "./CustomFoodForm";
import { MealFields } from "./MealFields";
import { PortionFields, type PortionUnit } from "./PortionFields";
import type { AppController } from "../../hooks/useAppController";
const sources = [
  {
    id: "pantry",
    Icon: Archive,
    title: "Продукт с полки",
    description: "Фрукт, яйцо, йогурт или другой продукт",
  },
  {
    id: "prepared",
    Icon: ChefHat,
    title: "Готовая еда",
    description: "Порция блюда, которое уже приготовлено",
  },
  {
    id: "other",
    Icon: Utensils,
    title: "Другая еда",
    description: "Кафе, доставка или еда вне полки",
  },
] as const;
export function FoodDialog({ app }: { app: AppController }) {
  return app.modal === "food" ? <IntakeForm app={app} /> : null;
}
function IntakeForm({ app }: { app: AppController }) {
  const { state, catalog, foodContext } = app;
  const [phase, setPhase] = useState<"source" | "amount">(
    foodContext.itemId ? "amount" : "source",
  );
  const [source, setSource] = useState<IntakeSource>(foodContext.source);
  const [foodId, setFoodId] = useState(foodContext.itemId ?? "");
  const [batchId, setBatchId] = useState(foodContext.itemId ?? "");
  const [quantity, setQuantity] = useState("");
  const [measureId, setMeasureId] = useState("g");
  const [unit, setUnit] = useState<PortionUnit>("servings");
  const [meal, setMeal] = useState(foodContext.meal);
  const [date, setDate] = useState(foodContext.date);
  const batches = state.batches.filter((b) => b.remainingFraction > 1e-6);
  const batch = batches.find((b) => b.id === batchId) ?? batches[0];
  const [amount, setAmount] = useState(
    String(batch ? Math.min(1, batch.remainingFraction * batch.servings) : 1),
  );
  const [approximate, setApproximate] = useState(source === "other");
  const [error, setError] = useState("");
  const [searchName, setSearchName] = useState("");
  const [creating, setCreating] = useState(false);
  const [picked, setPicked] = useState<CatalogMatch | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const {
    remote,
    busy: searching,
    searchError,
  } = useCatalogLookup(
    searchName,
    phase === "amount" && source === "other" && !creating && !foodId,
  );
  const options = catalog.filter(
    (food) => source !== "pantry" || app.available(food.id) > 0,
  );
  const food =
    options.find((f) => f.id === foodId) ??
    (picked && source === "other" && picked.id === foodId
      ? catalogFood(picked)
      : source === "pantry" && options.length === 1
        ? options[0]
        : undefined);
  const measures = foodMeasures(food),
    measure = measures.find((m) => m.id === measureId) ?? measures[0];
  const grams = Number(quantity) * measure.grams;
  const fraction =
    unit === "servings"
      ? Number(amount) / (batch?.servings ?? 1)
      : unit === "grams"
        ? Number(amount) / ((batch ? batchWeight(batch) : undefined) ?? 1)
        : Number(amount) / 100;
  const valid =
    source === "prepared"
      ? Number.isFinite(fraction) && fraction > 0
      : Number.isFinite(grams) && grams > 0;
  const preview =
    source === "prepared" && batch
      ? scale(batch.nutrients, valid ? fraction : 0)
      : food
        ? scale(food.per100, valid ? grams / 100 : 0)
        : null;
  const canSubmit = source === "prepared" ? !!batch : !!food;
  function chooseSource(next: IntakeSource) {
    if (next !== source) {
      setFoodId("");
      setQuantity("");
      setSearchName("");
      setPicked(null);
      setConfirmed(false);
      setMeasureId("g");
      setApproximate(next === "other");
    }
    setSource(next);
    setPhase("amount");
    setCreating(false);
    setError("");
  }
  return (
    <Modal
      title={
        creating
          ? "Своя еда"
          : phase === "source"
            ? "Что ты съел?"
            : "Записать приём пищи"
      }
      onBack={
        creating
          ? () => setCreating(false)
          : phase === "amount" && !foodContext.itemId
            ? () => setPhase("source")
            : undefined
      }
      onClose={() => app.setModal(null)}
    >
      {phase === "source" ? (
        <>
          <p className="intake-context-caption">
            {meal} ·{" "}
            {date
              ? new Date(date + "T12:00:00").toLocaleDateString("ru", {
                  day: "numeric",
                  month: "long",
                })
              : "Выбери дату"}
          </p>
          <div className="intake-source-choices" aria-label="Откуда еда">
            {sources.map(({ id, Icon, title, description }) => (
              <button
                key={id}
                aria-label={title}
                onClick={() => chooseSource(id)}
              >
                <span>
                  <Icon size={23} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
        </>
      ) : creating ? (
        <>
          <CustomFoodForm
            initialName={searchName}
            app={app}
            onCreated={(created) => {
              setFoodId(created.id);
              setCreating(false);
              setError("");
            }}
          />
        </>
      ) : (
        <>
          <form
            className="intake-form"
            noValidate
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                const context = { meal, date };
                const intake =
                  source === "prepared"
                    ? { ...context, source, batchId: batch?.id ?? "", fraction }
                    : {
                        ...context,
                        source,
                        foodId: food?.id ?? "",
                        grams,
                        approximate: approximate || measure.approximate,
                      };
                const newFood =
                  source === "other" &&
                  picked &&
                  food?.id === picked.id &&
                  !catalog.some((f) => f.id === food.id)
                    ? food
                    : null;
                if (newFood && !confirmed)
                  throw new Error(
                    "Проверь значения на упаковке и подтверди КБЖУ.",
                  );
                const nextState = newFood
                  ? { ...state, customFoods: [...state.customFoods, newFood] }
                  : state;
                await app.commit(
                  recordIntake(
                    nextState,
                    intake,
                    newFood ? [...catalog, newFood] : catalog,
                    crypto.randomUUID(),
                  ),
                );
                app.setModal(null);
                app.setError("");
                app.setMessage("Приём пищи записан");
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            {source === "prepared" ? (
              batch ? (
                <>
                  <div className="prepared-picker" aria-label="Готовое блюдо">
                    {batches.map((b) => (
                      <button
                        type="button"
                        key={b.id}
                        className={b.id === batch.id ? "selected" : ""}
                        aria-pressed={b.id === batch.id}
                        onClick={() => {
                          setBatchId(b.id);
                          setUnit("servings");
                          setAmount(
                            String(
                              Math.min(1, b.remainingFraction * b.servings),
                            ),
                          );
                          setError("");
                        }}
                      >
                        <ChefHat size={22} />
                        <span>
                          <strong>{b.recipeName}</strong>
                          <small>
                            {batchWeight(b)
                              ? `Осталось ${Math.round(batchWeight(b)! * b.remainingFraction)} г`
                              : `Осталось ${Number((b.remainingFraction * b.servings).toFixed(1))} порции`}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <PortionFields
                    batch={batch}
                    unit={unit}
                    amount={amount}
                    onAmount={setAmount}
                    onUnit={(next) => {
                      setAmount(
                        String(
                          Number(
                            (
                              fraction *
                              (next === "percent"
                                ? 100
                                : next === "grams"
                                  ? batchWeight(batch)!
                                  : batch.servings)
                            ).toFixed(6),
                          ),
                        ),
                      );
                      setUnit(next);
                    }}
                  />
                </>
              ) : (
                <Empty>
                  Готовой еды пока нет.
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      app.setModal(null);
                      app.setTab("home");
                    }}
                  >
                    Выбрать рецепт
                  </button>
                </Empty>
              )
            ) : (
              <>
                {options.length ? (
                  <>
                    <FoodPicker
                      foods={options}
                      remote={
                        source === "other"
                          ? remote.filter(
                              (p) => !catalog.some((f) => f.id === p.id),
                            )
                          : []
                      }
                      searching={searching}
                      searchError={searchError}
                      query={searchName}
                      onQuery={setSearchName}
                      onReselect={() => {
                        setFoodId("");
                        setQuantity("");
                        setError("");
                      }}
                      selected={food}
                      stock={source === "pantry" ? app.available : undefined}
                      onSelect={(next, match) => {
                        setPicked(match ?? null);
                        setConfirmed(false);
                        setFoodId(next.id);
                        setMeasureId("g");
                        setQuantity("");
                        setError("");
                      }}
                    />
                    {food && (
                      <>
                        {source === "other" && picked?.id === food.id && (
                          <CatalogConfirmation
                            picked={picked}
                            confirmed={confirmed}
                            setConfirmed={setConfirmed}
                          />
                        )}
                        <label
                          className="intake-amount-label"
                          htmlFor="intake-amount"
                        >
                          Сколько съел?
                        </label>
                        <div className="intake-amount-control">
                          <input
                            id="intake-amount"
                            aria-label={
                              measure.id === "g"
                                ? "Количество, г"
                                : `Количество, ${measure.label}`
                            }
                            type="number"
                            inputMode="decimal"
                            min="0.0001"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            required
                          />
                          <Select
                            aria-label="Единица количества"
                            value={measure.id}
                            onChange={(e) => {
                              const m = measures.find(
                                (m) => m.id === e.target.value,
                              )!;
                              if (quantity && valid)
                                setQuantity(
                                  String(Number((grams / m.grams).toFixed(6))),
                                );
                              setMeasureId(m.id);
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
                          {(measure.id === "g"
                            ? [100, 150, 200]
                            : [1, 2, 3]
                          ).map((n) => (
                            <button
                              type="button"
                              key={n}
                              aria-pressed={quantity === String(n)}
                              onClick={() => setQuantity(String(n))}
                            >
                              {n} {measure.label}
                            </button>
                          ))}
                        </div>
                        {measure.approximate && (
                          <p className="intake-measure-note">
                            Примерно{" "}
                            {Number.isFinite(grams)
                              ? grams.toLocaleString("ru", {
                                  maximumFractionDigits: 1,
                                })
                              : "—"}{" "}
                            г. Для точного количества выбери граммы.
                          </p>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <Empty>На полке пока нет продуктов.</Empty>
                )}
                {source === "other" && (
                  <button
                    type="button"
                    className="text-button intake-add-own"
                    onClick={() => setCreating(true)}
                  >
                    Нет в списке — добавить своё
                  </button>
                )}
              </>
            )}
            {canSubmit && (
              <>
                <div className="intake-context intake-context-open">
                  <MealFields
                    meal={meal}
                    date={date}
                    onMeal={setMeal}
                    onDate={setDate}
                  />
                  {source !== "prepared" && (
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={approximate}
                        onChange={(e) => setApproximate(e.target.checked)}
                      />
                      Приблизительная запись
                    </label>
                  )}
                </div>
                {preview && (
                  <div className="intake-preview intake-preview-compact">
                    <span>Съеденная часть</span>
                    <Macros n={preview} />
                  </div>
                )}
                {error && (
                  <p className="notice error" role="alert">
                    {error}
                  </p>
                )}
                <button className="primary" disabled={!valid || app.saving}>
                  Добавить в дневник
                </button>
              </>
            )}
          </form>
        </>
      )}
    </Modal>
  );
}
