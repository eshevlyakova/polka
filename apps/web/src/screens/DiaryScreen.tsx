import {
  Plus,
  Pencil,
  Trash2,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  Award,
  ArrowUpRight,
} from "lucide-react";
import { Empty, Macros } from "../components/ui";
import { WeekStrip } from "../components/WeekStrip";
import { getAchievements } from "../domain/achievements";
import { deleteEntry } from "../domain/actions";
import { sum } from "../domain/nutrition";
import type { AppController } from "../hooks/useAppController";
const meals = [
  { name: "Завтрак", Icon: Sunrise },
  { name: "Обед", Icon: Sun },
  { name: "Перекус", Icon: Coffee },
  { name: "Ужин", Icon: Moon },
];
export function DiaryScreen({ app }: { app: AppController }) {
  const {
    state,
    tab,
    diaryDate,
    setDiaryDate,
    run,
    commit,
    setEditingEntryId,
  } = app;
  if (tab !== "diary") return null;
  const records = state.diary.filter((e) => e.date === diaryDate);
  const n = sum(records.map((e) => e.nutrients));
  const achievements = getAchievements(state);
  const unlocked = achievements.filter((item) => item.unlocked).length;
  const other = records.filter((e) => !meals.some((m) => m.name === e.meal));
  return (
    <>
      <div className="heading">
        <div>
          <p className="eyebrow">ТВОЯ ИСТОРИЯ ПИТАНИЯ</p>
          <h1>Дневник</h1>
        </div>
        <button
          className="round"
          aria-label="Записать приём пищи"
          onClick={() => app.openFood("Завтрак", diaryDate)}
        >
          <Plus />
        </button>
      </div>
      <WeekStrip
        selected={diaryDate}
        onSelect={setDiaryDate}
        entries={state.diary}
      />
      <section className="card diary-overview">
        <div className="summary-top">
          <p>Итог за день</p>
          <span>{records.length} записи</span>
        </div>
        <Macros n={n} />
      </section>
      {meals.map(({ name, Icon }) => {
        const entries = records.filter((e) => e.meal === name);
        return (
          <section className="meal-group" key={name}>
            <div className="meal-heading">
              <span className="meal-icon">
                <Icon size={19} />
              </span>
              <h2>{name}</h2>
              <span>
                {entries.length
                  ? `${Math.round(sum(entries.map((e) => e.nutrients)).kcal)} ккал`
                  : "Пока без записи"}
              </span>
            </div>
            {entries.map((e) => (
              <article className="card diary-entry" key={e.id}>
                <div className="entry-topline">
                  <small>
                    {e.eatenAt || e.meal} · {e.source || "Запись вручную"}
                  </small>
                  <div className="entry-actions">
                    <button
                      className="icon-button"
                      aria-label={`Редактировать запись ${e.name}`}
                      onClick={() => setEditingEntryId(e.id)}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Удалить запись ${e.name}`}
                      onClick={() =>
                        run(() => commit(deleteEntry(state, e.id)))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <h3>{e.name}</h3>
                <p className="muted">
                  {e.amountLabel}
                  {e.approximate ? " · оценка" : ""}
                </p>
                <Macros n={e.nutrients} />
                {e.note && <p className="entry-note">{e.note}</p>}
              </article>
            ))}
            <button
              className="add-meal"
              onClick={() => app.openFood(name, diaryDate)}
            >
              <Plus size={17} />
              {entries.length
                ? "Добавить ещё продукт или блюдо"
                : "Добавить продукт или блюдо"}
            </button>
          </section>
        );
      })}
      {other.map((e) => (
        <section className="card" key={e.id}>
          <h3>{e.name}</h3>
          <Macros n={e.nutrients} />
          <button
            className="text-button"
            onClick={() => setEditingEntryId(e.id)}
          >
            Изменить запись
          </button>
        </section>
      ))}
      {!records.length && (
        <Empty>Выбери день с отметкой или добавь первую запись.</Empty>
      )}
      <button
        className="achievement-card achievement-link"
        onClick={() => app.setTab("profile")}
      >
        <div className="achievement-icon">
          <Award size={26} />
        </div>
        <div>
          <h3>Твоя коллекция достижений</h3>
          <p>
            Открыто {unlocked} из {achievements.length} · Посмотреть коллекцию
          </p>
        </div>
        <ArrowUpRight size={22} aria-hidden="true" />
      </button>
    </>
  );
}
