import { ArrowRight, ChefHat } from "lucide-react";
import type { AppController } from "../hooks/useAppController";
import { formatAmount } from "../domain/cooking";
export function ReadyMeals({ app }: { app: AppController }) {
  const batches = app.state.batches.filter((b) => b.remainingFraction > 1e-6);
  if (!batches.length || app.recipeFoodId) return null;
  return (
    <section className="ready-meals" aria-labelledby="ready-meals-title">
      <div className="ready-meals-heading">
        <h2 id="ready-meals-title">
          Уже есть готовое <span>{batches.length}</span>
        </h2>
        <button className="text-button" onClick={app.openPreparedFood}>
          На полку <ArrowRight size={14} />
        </button>
      </div>
      {batches.slice(0, 3).map((batch) => (
        <button
          className="ready-meal"
          key={batch.id}
          onClick={() => app.recordBatch(batch.id)}
        >
          <span className="ready-meal-icon">
            <ChefHat size={21} />
          </span>
          <span>
            <strong>{batch.recipeName}</strong>
            <small>
              Осталось {formatAmount(batch.remainingFraction * batch.servings)}{" "}
              порц.
            </small>
          </span>
          <ArrowRight size={17} />
        </button>
      ))}
      {batches.length > 3 && (
        <button className="text-button" onClick={app.openPreparedFood}>
          Ещё блюд: {batches.length - 3}
        </button>
      )}
    </section>
  );
}
