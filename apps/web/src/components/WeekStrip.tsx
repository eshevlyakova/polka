import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { localDate, type DiaryEntry } from "../domain/model";
import { Modal } from "./ui";

export function WeekStrip({
  selected,
  onSelect,
  entries,
}: {
  selected: string;
  onSelect: (day: string) => void;
  entries: DiaryEntry[];
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState(selected.slice(0, 7));
  const anchor = new Date(selected + "T12:00:00");
  const dates = new Set(entries.map((entry) => entry.date));
  const today = localDate();
  function shiftWeek(days: number) {
    const date = new Date(selected + "T12:00:00");
    date.setDate(date.getDate() + days);
    onSelect(localDate(date));
  }
  function shiftMonth(amount: number) {
    const date = new Date(month + "-01T12:00:00");
    date.setMonth(date.getMonth() + amount);
    setMonth(localDate(date).slice(0, 7));
  }
  function dayButton(date: Date, prefix: string) {
    const key = localDate(date);
    return (
      <button
        key={key}
        type="button"
        onClick={() => {
          onSelect(key);
          if (prefix === "calendar") setCalendarOpen(false);
        }}
        aria-label={`Дневник за ${date.toLocaleDateString("ru")}`}
        aria-pressed={key === selected}
        aria-current={key === today ? "date" : undefined}
        className={key === selected ? "selected" : ""}
      >
        {prefix === "week" && (
          <span>{date.toLocaleDateString("ru", { weekday: "short" })}</span>
        )}
        <strong>{date.getDate()}</strong>
        <i className={dates.has(key) ? "has-entries" : ""} />
      </button>
    );
  }
  const weekday = (anchor.getDay() + 6) % 7;
  anchor.setDate(anchor.getDate() - weekday);
  const monthStart = new Date(month + "-01T12:00:00");
  const offset = (monthStart.getDay() + 6) % 7;
  const count = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  return (
    <>
      <div className="diary-calendar-toolbar">
        <button
          className="icon-button"
          aria-label="Предыдущая неделя"
          onClick={() => shiftWeek(-7)}
        >
          <ChevronLeft />
        </button>
        <button
          className="calendar-open"
          onClick={() => {
            setMonth(selected.slice(0, 7));
            setCalendarOpen(true);
          }}
        >
          <CalendarDays size={19} />
          {new Date(selected + "T12:00:00").toLocaleDateString("ru", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </button>
        <button
          className="icon-button"
          aria-label="Следующая неделя"
          onClick={() => shiftWeek(7)}
        >
          <ChevronRight />
        </button>
      </div>
      <div className="week-strip" aria-label="Неделя дневника">
        {Array.from({ length: 7 }, (_, index) => {
          const date = new Date(anchor);
          date.setDate(date.getDate() + index);
          return dayButton(date, "week");
        })}
      </div>
      {selected !== today && (
        <button
          className="text-button calendar-today"
          onClick={() => onSelect(today)}
        >
          Вернуться к сегодня
        </button>
      )}
      {calendarOpen && (
        <Modal title="Выбрать дату" onClose={() => setCalendarOpen(false)}>
          <div className="diary-calendar-toolbar">
            <button
              className="icon-button"
              aria-label="Предыдущий месяц"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft />
            </button>
            <h3 aria-live="polite">
              {monthStart.toLocaleDateString("ru", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <button
              className="icon-button"
              aria-label="Следующий месяц"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight />
            </button>
          </div>
          <div className="month-calendar">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
              <span className="calendar-weekday" key={day}>
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: count }, (_, index) =>
              dayButton(
                new Date(
                  monthStart.getFullYear(),
                  monthStart.getMonth(),
                  index + 1,
                  12,
                ),
                "calendar",
              ),
            )}
          </div>
          <p className="muted calendar-legend">
            Точкой отмечены дни с записями.
          </p>
          <button
            className="secondary"
            onClick={() => {
              onSelect(today);
              setCalendarOpen(false);
            }}
          >
            Сегодня
          </button>
        </Modal>
      )}
    </>
  );
}
