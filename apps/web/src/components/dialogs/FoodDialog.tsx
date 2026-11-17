import { useState } from "react";
import {
  Archive,
  ChefHat,
  Utensils,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
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
  const [creating, setCreating] = useState(false);
  const options = catalog.filter(
    (food) => source !== "pantry" || app.available(food.id) > 0,
  );
  const food = options.find((f) => f.id === foodId) ?? options[0];
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
    setSource(next);
    setPhase("amount");
    setCreating(false);
    setError("");
    setApproximate(next === "other");
    setMeasureId("g");
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
          <button className="text-button" onClick={() => setCreating(false)}>
            <ArrowLeft size={15} />К выбору еды
          </button>
          <CustomFoodForm
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
          <button
            className="intake-change-source"
            onClick={() => setPhase("source")}
          >
            <ArrowLeft size={14} />
            {sources.find((s) => s.id === source)?.title} · изменить
          </button>
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
                await app.commit(
                  recordIntake(state, intake, catalog, crypto.randomUUID()),
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
                  <label>
                    Готовое блюдо
                    <Select
                      aria-label="Готовое блюдо"
                      value={batch.id}
                      onChange={(e) => {
                        setBatchId(e.target.value);
                        const b = batches.find((i) => i.id === e.target.value)!;
                        setUnit("servings");
                        setAmount(
                          String(Math.min(1, b.remainingFraction * b.servings)),
                        );
                      }}
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.recipeName}
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
                {food ? (
                  <>
                    <label>
                      {source === "pantry"
                        ? "Продукт с полки"
                        : "Продукт или блюдо"}
                      <Select
                        value={food.id}
                        onChange={(e) => {
                          setFoodId(e.target.value);
                          setMeasureId("g");
                        }}
                      >
                        {options.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                    {source === "pantry" && (
                      <p className="intake-stock">
                        На полке: {app.available(food.id).toLocaleString("ru")}{" "}
                        г
                      </p>
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
                <button className="primary">Добавить в дневник</button>
              </>
            )}
          </form>
        </>
      )}
    </Modal>
  );
}
