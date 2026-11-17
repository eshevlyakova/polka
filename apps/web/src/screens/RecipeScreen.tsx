import { useState } from "react";
import { ArrowLeft, Check, ChefHat, Clock3, Minus, Plus } from "lucide-react";
import { Macros } from "../components/ui";
import { IngredientRow } from "../components/IngredientRow";
import { calculate, scale } from "../domain/nutrition";
import { cook } from "../domain/actions";
import {
  estimateWeight,
  formatAmount,
  scaleIngredients,
  shortages,
} from "../domain/cooking";
import type { AppController } from "../hooks/useAppController";
export function RecipeScreen({ app }: { app: AppController }) {
  const recipe = app.selected!;
  return <RecipePage key={recipe.id} app={app} />;
}
function RecipePage({ app }: { app: AppController }) {
  const recipe = app.selected!;
  const [editing, setEditing] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const [servingsInput, setServingsInput] = useState(
    String(app.recipeServings),
  );
  const valid =
    app.draft.length > 0 &&
    app.draft.every((i) => Number.isFinite(i.grams) && i.grams > 0);
  const missing = shortages(app.draft, app.state.pantry, app.catalog);
  const total = calculate(
    app.draft.map((i) => ({
      ...i,
      grams: Number.isFinite(i.grams) && i.grams > 0 ? i.grams : 0,
    })),
    app.catalog,
  );
  function portions(value: number) {
    try {
      app.setDraft(scaleIngredients(app.draft, app.recipeServings, value));
      app.setRecipeServings(value);
      setServingsInput(String(value));
      setWeight("");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <article className="recipe-page" aria-label="Страница рецепта">
      <button className="recipe-back" onClick={app.closeRecipe}>
        <ArrowLeft size={19} />К рецептам
      </button>
      <header className="recipe-page-heading">
        <h1>{recipe.name}</h1>
        <p>
          <Clock3 size={15} />
          {recipe.minutes} мин<span>·</span>
          {recipe.equipment}
        </p>
      </header>
      <>
        <section
          className="recipe-portions"
          aria-labelledby="recipe-portions-title"
        >
          <div>
            <h2 id="recipe-portions-title">Сколько приготовим?</h2>
            <p>
              1 порция {weight && Number(weight) > 0 ? "—" : "≈"}{" "}
              {formatAmount(
                (Number(weight) > 0
                  ? Number(weight)
                  : estimateWeight(recipe, app.draft)) / app.recipeServings,
                0,
              )}{" "}
              г
            </p>
          </div>
          <div className="portions-stepper">
            <button
              aria-label="Уменьшить порции"
              disabled={app.recipeServings <= 1}
              onClick={() => portions(app.recipeServings - 1)}
            >
              <Minus size={17} />
            </button>
            <input
              aria-label="Количество порций для приготовления"
              type="number"
              min="1"
              max="50"
              step="1"
              value={servingsInput}
              onChange={(e) => {
                setServingsInput(e.target.value);
                if (e.target.value) portions(Number(e.target.value));
              }}
              onBlur={() => {
                if (!servingsInput) {
                  setServingsInput(String(app.recipeServings));
                  setError("");
                }
              }}
            />
            <button
              aria-label="Увеличить порции"
              disabled={app.recipeServings >= 50}
              onClick={() => portions(app.recipeServings + 1)}
            >
              <Plus size={17} />
            </button>
          </div>
        </section>
        <div className="recipe-nutrition">
          <section>
            <h3>На одну порцию</h3>
            <Macros n={scale(total, 1 / app.recipeServings)} />
          </section>
          <section className="recipe-total-inline">
            <h3>На всё блюдо · {app.recipeServings} порц.</h3>
            <Macros n={total} />
          </section>
        </div>
        <section className="recipe-ingredients">
          <div className="section-title">
            <h2>Ингредиенты</h2>
            <button
              className="text-button"
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Готово" : "Изменить"}
            </button>
          </div>
          {app.draft.map((item, index) => (
            <IngredientRow
              key={index}
              item={item}
              catalog={app.catalog}
              editing={editing}
              available={app.available(item.foodId)}
              onChange={(value) => {
                setWeight("");
                app.setDraft(
                  app.draft.map((i, j) => (j === index ? value : i)),
                );
              }}
              onRemove={() => {
                setWeight("");
                app.setDraft(app.draft.filter((_, j) => j !== index));
              }}
            />
          ))}
          {editing && (
            <button
              className="text-button"
              onClick={() => {
                setWeight("");
                app.setDraft([
                  ...app.draft,
                  { foodId: app.catalog[0].id, grams: 50 },
                ]);
              }}
            >
              <Plus size={15} />
              Добавить ингредиент
            </button>
          )}
        </section>
        {!!missing.length && (
          <section
            className="recipe-shortages"
            aria-label="Не хватает продуктов"
          >
            <h3>Нужно пополнить полку</h3>
            {missing.map((i) => (
              <div key={i.foodId}>
                <span>
                  {i.name}
                  <small>Не хватает {formatAmount(i.grams)} г</small>
                </span>
                <button
                  className="text-button"
                  onClick={() => app.openPantry(i.foodId)}
                >
                  Добавить
                </button>
              </div>
            ))}
            <p>Можно изменить состав или количество порций.</p>
          </section>
        )}
        <section className="recipe-method" aria-label="Шаги приготовления">
          <div className="section-title">
            <h2>Как приготовить</h2>
            <span>{recipe.steps.length} шагов</span>
          </div>
          <ol>
            {recipe.steps.map((text, index) => (
              <li
                key={index}
                className={done.includes(index) ? "step-done" : ""}
              >
                <button
                  type="button"
                  aria-label={`Шаг ${index + 1} выполнен`}
                  aria-pressed={done.includes(index)}
                  onClick={() =>
                    setDone(
                      done.includes(index)
                        ? done.filter((i) => i !== index)
                        : [...done, index],
                    )
                  }
                >
                  {done.includes(index) ? <Check size={18} /> : index + 1}
                </button>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="recipe-finish">
          <h2>Блюдо готово?</h2>
          <details className="cooked-weight">
            <summary>Указать вес готового блюда</summary>
            <label>
              Готовый вес, г
              <input
                aria-label="Готовый вес, г"
                type="number"
                min="1"
                max="100000"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Если взвесил блюдо"
              />
            </label>
            <p>
              Уточнит расчётный вес порции. Без взвешивания остаётся
              приблизительная оценка.
            </p>
          </details>
          <button
            className="primary"
            disabled={
              !valid ||
              missing.length > 0 ||
              Number(servingsInput) !== app.recipeServings
            }
            onClick={async () => {
              try {
                const next = cook(
                  app.state,
                  { ...recipe, servings: app.recipeServings },
                  app.draft,
                  app.catalog,
                  crypto.randomUUID(),
                  new Date().toISOString(),
                  weight.trim() ? Number(weight) : undefined,
                );
                await app.commit(next);
                app.finishCooking();
                app.setMessage(
                  "Блюдо готово и добавлено на полку. Запиши порцию, когда поешь.",
                );
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <Check size={18} />
            Приготовил — списать продукты
          </button>
          {!!missing.length && (
            <p className="recipe-measures-note">
              Для списания добавь недостающее или измени состав.
            </p>
          )}
        </section>
      </>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {recipe.origin && (
        <p className="library-attribution">
          Основа рецепта:{" "}
          <a href={recipe.origin.url} target="_blank" rel="noreferrer">
            {recipe.origin.label}
          </a>{" "}
          ·{" "}
          <a href={recipe.origin.licenseUrl} target="_blank" rel="noreferrer">
            {recipe.origin.license}
          </a>
          . Адаптировано под полку.
        </p>
      )}
    </article>
  );
}
