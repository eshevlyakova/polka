import { WeightGoal } from "../components/WeightGoal";
import { PearMascot } from "../components/PearMascot";
import { FoodArt } from "../components/FoodArt";
import { CalendarDays, ArrowUpRight, Leaf } from "lucide-react";
import { localDate } from "../domain/model";
import { Plus } from "lucide-react";
import { Empty, Macros } from "../components/ui";
import { expiryDays } from "../domain/input";

import type { AppController } from "../hooks/useAppController";
export function TodayScreen({ app }: { app: AppController }) {
  const {
    state,
    tab,
    setTab,
    setModal,
    catalog,
    total,
    foodName,
    sortedRecipes,
    recipeCard,
  } = app;
  return (
    <>
      {tab === "today" && (
        <>
          <div className="heading">
            <div>
              <p className="eyebrow">
                {new Date().toLocaleDateString("ru", {
                  day: "numeric",
                  month: "long",
                  weekday: "long",
                })}
              </p>
              <h1>Сегодня</h1>
            </div>
            <PearMascot />
          </div>
          <p className="muted welcome-line">
            Хороший день начинается с заботы о себе.
          </p>
          <section className="card summary">
            <div className="summary-top">
              <p className="summary-label">Съедено сегодня</p>
              <span className="goal-badge">
                {total.kcal > 0
                  ? `${Math.round((total.kcal / Math.max(1, state.settings.calorieGoal)) * 100)}% цели`
                  : "Начнём день"}
              </span>
            </div>
            <div className="calories">
              <b>{Math.round(total.kcal)}</b>
              <span>/ {state.settings.calorieGoal || "—"} ккал</span>
            </div>
            {state.settings.calorieGoal > 0 && (
              <progress
                max={state.settings.calorieGoal}
                value={total.kcal}
                aria-label="Калории за день"
              />
            )}
            <Macros n={total} />
            <button className="primary" onClick={() => app.openFood()}>
              <Plus size={18} />
              Добавить еду
            </button>
          </section>
          <WeightGoal app={app} />
          <div className="account-pulse">
            <div>
              <CalendarDays size={19} />
              <span>
                <strong>
                  {new Set(state.diary.map((e) => e.date)).size} дней
                </strong>{" "}
                с записями
              </span>
            </div>
            <div>
              <Leaf size={19} />
              <span>
                <strong>{state.pantry.length} продуктов</strong> на полке
              </span>
            </div>
          </div>
          <div className="section-title">
            <h2>Уже в дневнике</h2>
            <button
              className="text-button"
              onClick={() => {
                app.setDiaryDate(localDate());
                setTab("diary");
              }}
            >
              Открыть →
            </button>
          </div>
          <div className="today-timeline">
            {state.diary
              .filter((e) => e.date === localDate())
              .slice()
              .reverse()
              .map((e) => (
                <button
                  className="timeline-entry"
                  key={e.id}
                  onClick={() => {
                    app.setDiaryDate(localDate());
                    setTab("diary");
                  }}
                >
                  <span className="timeline-dot" />
                  <span className="timeline-info">
                    <small>
                      {e.meal}
                      {e.eatenAt ? ` · ${e.eatenAt}` : ""}
                    </small>
                    <strong>{e.name}</strong>
                  </span>
                  <span className="timeline-kcal">
                    {Math.round(e.nutrients.kcal)}
                    <small>ккал</small>
                  </span>
                </button>
              ))}
          </div>
          <div className="section-title">
            <h2>Что приготовим?</h2>
            <button className="text-button" onClick={() => setTab("recipes")}>
              Все рецепты →
            </button>
          </div>
          {sortedRecipes.length ? (
            recipeCard(sortedRecipes[0])
          ) : (
            <Empty>Измени ограничения, чтобы увидеть рецепты.</Empty>
          )}
          <div className="section-title">
            <h2>Скоро использовать</h2>
            <button className="text-button" onClick={() => setTab("pantry")}>
              На полку →
            </button>
          </div>
          {state.pantry.filter(
            (p) => p.expiresOn && expiryDays(p.expiresOn)! <= 2,
          ).length ? (
            state.pantry
              .filter((p) => p.expiresOn && expiryDays(p.expiresOn)! <= 2)
              .map((p) => (
                <div className="item" key={p.id}>
                  <FoodArt foodId={p.foodId} />
                  <div>
                    <b>{foodName(p.foodId)}</b>
                    <p>{p.grams} г</p>
                  </div>
                  <span className="badge">
                    {expiryDays(p.expiresOn)! < 0
                      ? "Срок прошёл"
                      : `Осталось ${expiryDays(p.expiresOn)} дн.`}
                  </span>
                </div>
              ))
          ) : (
            <Empty>Здесь появятся продукты с ближайшими сроками.</Empty>
          )}
        </>
      )}
    </>
  );
}
