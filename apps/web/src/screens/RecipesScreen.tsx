import { Select } from "../components/Select";
import type { AppController } from "../hooks/useAppController";
export function RecipesScreen({ app }: { app: AppController }) {
  const {
    state,
    commit,
    tab,
    setModal,
    setDraft,
    catalog,
    run,
    sortedRecipes,
    recipeCard,
    recordBatch,
  } = app;
  return (
    <>
      {tab === "recipes" && (
        <>
          <h1>Что приготовим?</h1>
          <p className="muted">Простые варианты без лишних покупок.</p>
          <label>
            Время приготовления
            <Select
              value={state.settings.maxMinutes}
              onChange={(e) =>
                run(() =>
                  commit({
                    ...state,
                    settings: {
                      ...state.settings,
                      maxMinutes: Number(e.target.value),
                    },
                  }),
                )
              }
            >
              <option value={10}>До 10 минут</option>
              <option value={20}>До 20 минут</option>
              <option value={30}>До 30 минут</option>
            </Select>
          </label>
          {sortedRecipes.map(recipeCard)}
          <button
            className="secondary"
            onClick={() => {
              setDraft([{ foodId: catalog[0].id, grams: 100 }]);
              setModal("own");
            }}
          >
            Приготовил своё блюдо
          </button>
          <h2>Готовые остатки</h2>
          {state.batches
            .filter((b) => b.remainingFraction > 1e-6)
            .map((b) => (
              <section className="card" key={b.id}>
                <h3>{b.recipeName}</h3>
                <p>
                  Осталось {Math.round(b.remainingFraction * 100)}% ·
                  приготовлено {new Date(b.cookedAt).toLocaleDateString("ru")}
                </p>
                <button className="secondary" onClick={() => recordBatch(b.id)}>
                  Записать порцию
                </button>
              </section>
            ))}
        </>
      )}
    </>
  );
}
