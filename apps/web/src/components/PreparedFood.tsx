import { ChefHat, Plus } from "lucide-react";
import { Empty, Macros } from "./ui";
import { scale } from "../domain/nutrition";
import type { AppController } from "../hooks/useAppController";

export function PreparedFood({ app }: { app: AppController }) {
  const batches = app.state.batches.filter(
    (batch) => batch.remainingFraction > 1e-6,
  );
  return (
    <section className="prepared-food" aria-label="Готовая еда">
      <p className="muted prepared-intro">
        Уже приготовлено — осталось выбрать, сколько съесть.
      </p>
      {batches.length ? (
        batches.map((batch) => (
          <article className="card prepared-card" key={batch.id}>
            <div className="prepared-card-heading">
              <span className="prepared-icon">
                <ChefHat size={23} />
              </span>
              <div>
                <h2>{batch.recipeName}</h2>
                <p>
                  Приготовлено{" "}
                  {new Date(batch.cookedAt).toLocaleDateString("ru", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>
            <div className="prepared-remaining">
              <strong>
                Осталось{" "}
                {(batch.remainingFraction * batch.servings).toLocaleString(
                  "ru",
                  { maximumFractionDigits: 2 },
                )}{" "}
                из {batch.servings} порций
              </strong>
              <span>{Math.round(batch.remainingFraction * 100)}% блюда</span>
            </div>
            <progress
              value={batch.remainingFraction}
              max={1}
              aria-label={`Остаток блюда: ${Math.round(batch.remainingFraction * 100)}%`}
            />
            <p className="prepared-macros-label">КБЖУ оставшейся части</p>
            <Macros n={scale(batch.nutrients, batch.remainingFraction)} />
            <button
              className="secondary"
              onClick={() => app.recordBatch(batch.id)}
            >
              <Plus size={17} />
              Записать порцию
            </button>
          </article>
        ))
      ) : (
        <Empty>
          Пока нет готовой еды. Приготовь блюдо по рецепту или добавь своё — оно
          появится здесь.
        </Empty>
      )}
      <button
        className="secondary"
        onClick={() => {
          app.setRecipeFoodId(null);
          app.setTab("recipes");
        }}
      >
        <ChefHat size={18} />
        Выбрать рецепт
      </button>
    </section>
  );
}
