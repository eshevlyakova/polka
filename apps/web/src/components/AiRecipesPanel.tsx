import { useEffect, useRef, useState } from "react";
import { Sparkles, LoaderCircle, Clock3, PenLine, X } from "lucide-react";
import { useTimedError } from "../hooks/useTimedError";
import { FeedbackError } from "./FeedbackError";
import { fetchAiRecipes, fetchAiRecipeSearch } from "../api/aiRecipes";
import { buildAiRequest } from "../domain/aiContext";
import type { AppController } from "../hooks/useAppController";
import { LibraryRecipeCard } from "./LibraryRecipeCard";

export function AiRecipesPanel({ app }: { app: AppController }) {
  const configured =
    import.meta.env.DEV || Boolean(import.meta.env.VITE_AI_API_URL);
  const [preferences, setPreferences] = useState("");
  const [minutes, setMinutes] = useState(String(app.state.settings.maxMinutes));
  const [testCode, setTestCode] = useState("");
  const [busy, setBusy] = useState(false);
  const { error, setError } = useTimedError();
  const [showGenerated, setShowGenerated] = useState(false);
  const current = useRef(app);
  current.current = app;
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      if (pending.current) {
        pending.current.abort();
        app.library.cancel();
      }
    },
    [],
  );
  const blocked = app.state.settings.exclusions
    .split(",")
    .map((word) => word.trim().toLocaleLowerCase())
    .filter(Boolean);
  const generated = (app.state.aiRecipes ?? []).filter(
    (recipe) =>
      recipe.minutes <= app.state.settings.maxMinutes &&
      !recipe.ingredients.some((item) =>
        blocked.some((word) =>
          app.foodName(item.foodId).toLocaleLowerCase().includes(word),
        ),
      ) &&
      (!app.recipeFoodId ||
        recipe.ingredients.some((item) => item.foodId === app.recipeFoodId)),
  );
  return (
    <section className="ai-recipes" aria-label="Подбор рецептов">
      <form
        className="ai-preferences-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending.current) return;
          const controller = new AbortController();
          try {
            if (
              !Number.isInteger(Number(minutes)) ||
              Number(minutes) < 5 ||
              Number(minutes) > 360
            )
              throw new Error("Время — целое число от 5 до 360 минут.");
            pending.current = controller;
            setBusy(true);
            setError("");
            setShowGenerated(false);
            app.library.clear();
            // In an account, persist request settings once, not on every keystroke.
            if (
              app.session?.mode === "account" &&
              Number(minutes) !== app.state.settings.maxMinutes
            )
              await app.commit({
                ...app.state,
                settings: {
                  ...app.state.settings,
                  maxMinutes: Number(minutes),
                },
              });
            if (controller.signal.aborted) return;
            const input = buildAiRequest(
              {
                ...app.state,
                settings: {
                  ...app.state.settings,
                  maxMinutes: Number(minutes),
                },
              },
              app.catalog,
              [
                preferences,
                app.recipeFoodId
                  ? `Используй ${app.foodName(app.recipeFoodId)}.`
                  : "",
              ]
                .filter(Boolean)
                .join(" ")
                .slice(0, 600),
              app.recipeFoodId ?? undefined,
            );
            const search = await fetchAiRecipeSearch(
              input,
              testCode,
              controller.signal,
            );
            if (controller.signal.aborted) return;
            const ensureCurrent = () => {
              const latest = current.current;
              if (
                JSON.stringify(input) !==
                JSON.stringify(
                  buildAiRequest(
                    latest.state,
                    latest.catalog,
                    input.preferences,
                    latest.recipeFoodId ?? undefined,
                  ),
                )
              )
                throw new Error(
                  "Полка или ограничения изменились во время подбора. Повтори запрос.",
                );
            };
            ensureCurrent();
            const page = await app.library.search(search);
            if (controller.signal.aborted) return;
            ensureCurrent();
            if (!page)
              throw new Error(
                "Не удалось загрузить каталог. Попробуй ещё раз.",
              );
            if (page.total > 0) return;
            const recipes = await fetchAiRecipes(
              {
                ...input,
                exclusions: search.exclusions,
                requiredIngredients: search.requiredIngredients,
              },
              testCode,
              controller.signal,
            );
            if (controller.signal.aborted) return;
            const latest = current.current;
            const updatedInput = buildAiRequest(
              latest.state,
              latest.catalog,
              input.preferences,
              latest.recipeFoodId ?? undefined,
            );
            if (JSON.stringify(input) !== JSON.stringify(updatedInput))
              throw new Error(
                "Полка или ограничения изменились во время подбора. Повтори запрос с актуальными данными.",
              );
            try {
              await latest.commit({ ...latest.state, aiRecipes: recipes });
            } catch {
              setError(
                "Не удалось сохранить рецепты. Проверь соединение и повтори подбор.",
                true,
              );
              return;
            }
            setShowGenerated(true);
          } catch (err) {
            if (!controller.signal.aborted)
              setError(
                err instanceof Error
                  ? err.message
                  : "Не удалось подобрать рецепты.",
              );
          } finally {
            if (pending.current === controller) {
              pending.current = null;
              if (!controller.signal.aborted) setBusy(false);
            }
          }
        }}
      >
        <h1 className="wish-label">
          <label htmlFor="recipe-wishes">Что хочется сегодня?</label>
        </h1>
        <div className="wish-note">
          <PenLine size={18} className="wish-note-icon" aria-hidden="true" />
          <textarea
            id="recipe-wishes"
            rows={2}
            maxLength={600}
            value={preferences}
            disabled={busy || !configured}
            onChange={(event) => {
              setPreferences(event.target.value);
              setError("");
            }}
            placeholder="Например, тёплый ужин без мяса…"
          />
        </div>
        <label className="time-manual">
          <span>
            <Clock3 size={16} />
            Время на готовку
          </span>
          <span className="time-manual-input">
            <input
              aria-label="Время на готовку, мин"
              type="number"
              inputMode="numeric"
              min="5"
              max="360"
              step="1"
              value={minutes}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value;
                setMinutes(value);
                setError("");
                if (
                  app.session?.mode !== "account" &&
                  Number.isInteger(Number(value)) &&
                  Number(value) >= 5 &&
                  Number(value) <= 360
                )
                  app.run(() =>
                    app.commit({
                      ...app.state,
                      settings: {
                        ...app.state.settings,
                        maxMinutes: Number(value),
                      },
                    }),
                  );
              }}
            />
            <span>мин</span>
          </span>
        </label>
        {import.meta.env.VITE_AI_API_URL && (
          <details className="ai-access">
            <summary>Код для закрытого тестирования</summary>
            <label>
              Код доступа
              <input
                type="password"
                autoComplete="off"
                value={testCode}
                maxLength={200}
                onChange={(event) => setTestCode(event.target.value)}
              />
              <span className="muted">
                Нужен, если открываешь тестовую версию вне Telegram.
              </span>
            </label>
          </details>
        )}
        <FeedbackError message={error} onDismiss={() => setError("")} />
        <button className="primary" disabled={busy || !configured}>
          {busy ? (
            <LoaderCircle size={18} className="ai-spinner" />
          ) : (
            <Sparkles size={18} />
          )}
          {busy ? "Подбираем рецепты…" : "Подобрать рецепты"}
        </button>
        {busy && (
          <button
            type="button"
            className="primary cancel-action"
            onClick={() => {
              pending.current?.abort();
              app.library.cancel();
              pending.current = null;
              setBusy(false);
            }}
          >
            <X size={18} />
            Отменить подбор
          </button>
        )}
      </form>
      {app.library.page && app.library.page.total > 0 && (
        <div className="ai-results library-preview">
          <div className="section-title">
            <h3>По твоему запросу</h3>
            <span className="recipe-count">
              Найдено {app.library.page.total}
            </span>
          </div>
          {app.library.page.items.slice(0, 3).map((r) => (
            <LibraryRecipeCard
              key={r.id}
              recipe={r}
              onOpen={app.openLibraryRecipe}
            />
          ))}
          <button className="secondary" onClick={app.openLibrary}>
            Смотреть все {app.library.page.total} рецептов
          </button>
        </div>
      )}
      {showGenerated &&
        (!app.library.page || app.library.page.total === 0) &&
        !!generated.length && (
          <div className="ai-results">
            <div className="section-title">
              <h3>Подобрали для тебя</h3>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  app.run(() => app.commit({ ...app.state, aiRecipes: [] }))
                }
              >
                Убрать подборку
              </button>
            </div>
            {generated.map(app.recipeCard)}
          </div>
        )}
    </section>
  );
}
