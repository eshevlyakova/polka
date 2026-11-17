import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Search,
  LoaderCircle,
  ChevronDown,
  ArrowUp,
  Clock3,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Select } from "../components/Select";
import { LibraryRecipeCard } from "../components/LibraryRecipeCard";
import { FeedbackError } from "../components/FeedbackError";
import {
  libraryCategories,
  libraryProducts,
  type LibrarySearch,
} from "../../../../shared/recipeLibrary";
import type { AppController } from "../hooks/useAppController";
export function LibraryScreen({ app }: { app: AppController }) {
  const { library } = app;
  const request = library.request;
  const [query, setQuery] = useState(request?.query ?? "");
  const [minutes, setMinutes] = useState(
    request?.maxMinutes ? String(request.maxMinutes) : "",
  );
  const [timeError, setTimeError] = useState("");
  useEffect(() => {
    setMinutes(request?.maxMinutes ? String(request.maxMinutes) : "");
    setTimeError("");
  }, [request?.maxMinutes]);
  function base(): LibrarySearch {
    return {
      query: "",
      maxMinutes: 0,
      category: "all",
      sort: "relevance",
      offset: 0,
      limit: 12,
      exclusions: app.state.settings.exclusions,
      products: libraryProducts(app.state.pantry, app.catalog),
    };
  }
  useEffect(() => {
    if (!library.request) void library.search(base());
  }, []);
  function change(patch: Partial<LibrarySearch>) {
    void library.search({
      ...(request ?? base()),
      ...patch,
      offset: 0,
      limit: 12,
    });
    window.scrollTo?.(0, 0);
  }
  function applyTime() {
    const value = minutes.trim();
    if (
      value &&
      (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 2880)
    ) {
      setTimeError("Введи от 1 до 2880 минут.");
      return;
    }
    setTimeError("");
    const maxMinutes = value ? Number(value) : 0;
    if (maxMinutes !== (request?.maxMinutes ?? 0)) change({ maxMinutes });
  }
  const page = library.page;
  const filtered = Boolean(
    request?.query ||
    request?.maxMinutes ||
    (request?.category && request.category !== "all") ||
    (request?.sort && request.sort !== "relevance") ||
    (request?.exclusions !== undefined &&
      request.exclusions !== app.state.settings.exclusions),
  );
  return (
    <section className="library-page">
      <button className="recipe-back" onClick={app.closeLibrary}>
        <ArrowLeft size={19} />
        На главную
      </button>
      <header className="library-heading">
        <div>
          <h1>{request?.query ? "Твоя подборка" : "Рецепты"}</h1>
          <p>
            {library.busy
              ? "Ищем подходящие блюда…"
              : page
                ? `Найдено ${page.total}`
                : "Выбери, что приготовить"}
          </p>
        </div>
        <span className="library-heading-mark" aria-hidden="true">
          <SlidersHorizontal size={25} />
        </span>
      </header>
      <div className="library-controls">
        <form
          className="library-search"
          onSubmit={(e) => {
            e.preventDefault();
            change({ query, requiredIngredients: [] });
          }}
        >
          <label htmlFor="library-query">Поиск по базе</label>
          <div className="library-search-field">
            <Search size={20} aria-hidden="true" />
            <input
              id="library-query"
              aria-label="Поиск рецептов"
              placeholder="Блюдо или продукт"
              value={query}
              maxLength={600}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                type="button"
                aria-label="Очистить название"
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button className="primary library-search-submit" type="submit">
            Найти рецепты
            <ArrowUp size={17} />
          </button>
        </form>
        <div className="library-filter-toolbar">
          <form
            className="library-time"
            onSubmit={(e) => {
              e.preventDefault();
              applyTime();
            }}
          >
            <label htmlFor="library-minutes">Время до</label>
            <div className="library-time-field">
              <Clock3 size={17} aria-hidden="true" />
              <input
                id="library-minutes"
                aria-label="Время в каталоге, мин"
                inputMode="numeric"
                type="text"
                maxLength={4}
                placeholder="Любое"
                value={minutes}
                aria-invalid={!!timeError}
                aria-describedby={timeError ? "library-time-error" : undefined}
                onChange={(e) => {
                  setMinutes(e.target.value);
                  setTimeError("");
                }}
                onBlur={applyTime}
              />
              {minutes && <span>мин</span>}
              {minutes && (
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Любое время"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setMinutes("");
                    setTimeError("");
                    change({ maxMinutes: 0 });
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </form>
          <label className="library-sort">
            Сначала
            <Select
              aria-label="Порядок рецептов"
              value={request?.sort ?? "relevance"}
              onChange={(e) =>
                change({ sort: e.target.value as LibrarySearch["sort"] })
              }
            >
              <option value="relevance">Подходящие</option>
              <option value="quick">Быстрые</option>
              <option value="calories">Менее калорийные</option>
            </Select>
          </label>
        </div>
        {timeError && (
          <p
            className="library-time-error"
            id="library-time-error"
            role="alert"
          >
            {timeError}
          </p>
        )}
      </div>
      <div
        className="library-categories"
        role="group"
        aria-label="Категория рецептов"
      >
        {Object.entries(libraryCategories).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={(request?.category ?? "all") === key}
            onClick={() => change({ category: key })}
          >
            {label}
          </button>
        ))}
      </div>
      {filtered && (
        <div className="library-reset-row">
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setMinutes("");
              setTimeError("");
              change(base());
            }}
          >
            <X size={14} />
            Сбросить фильтры
          </button>
        </div>
      )}
      <FeedbackError
        message={library.error}
        onDismiss={() => library.setError("")}
      />
      {library.busy && !page && (
        <p className="library-loading" role="status">
          <LoaderCircle className="ai-spinner" size={20} />
          Подбираем рецепты…
        </p>
      )}
      {page && (
        <>
          <div className="library-grid">
            {page.items.map((r) => (
              <LibraryRecipeCard
                key={r.id}
                recipe={r}
                onOpen={app.openLibraryRecipe}
              />
            ))}
          </div>
          {!page.total && (
            <div className="empty">
              По этим условиям ничего не найдено. Попробуй изменить продукт,
              время или категорию.
            </div>
          )}
          <div className="library-pagination">
            <p role="status">
              Показано {page.items.length} из {page.total}
            </p>
            {page.offset + page.limit < page.total && (
              <button
                className="secondary"
                disabled={library.busy}
                onClick={library.more}
              >
                {library.busy ? (
                  <LoaderCircle size={18} className="ai-spinner" />
                ) : (
                  <ChevronDown size={18} />
                )}
                Загрузить ещё {Math.min(12, page.total - page.items.length)}
              </button>
            )}
            {page.items.length > 12 && (
              <button
                className="text-button"
                onClick={() =>
                  window.scrollTo?.({ top: 0, behavior: "smooth" })
                }
              >
                <ArrowUp size={17} />К началу подборки
              </button>
            )}
          </div>
        </>
      )}
      {library.error && (
        <button className="secondary" onClick={() => change({})}>
          Повторить поиск
        </button>
      )}
      <p className="library-attribution">
        Рецепты:{" "}
        <a
          href="https://theunitools.com/ru/data"
          target="_blank"
          rel="noreferrer"
        >
          UniTools
        </a>{" "}
        ·{" "}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-SA 4.0
        </a>
      </p>
    </section>
  );
}
