import { Flag, Plus } from "lucide-react";
import { localDate } from "../domain/model";
import { sortedWeights } from "../domain/weight";
import type { AppController } from "../hooks/useAppController";
const kg = (value: number) =>
  value.toLocaleString("ru", { maximumFractionDigits: 1 });
const dateLabel = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("ru", {
    day: "numeric",
    month: "short",
  });
export function WeightGoal({ app }: { app: AppController }) {
  const profile = app.state.profile;
  if (
    !profile ||
    (profile.weightKg === undefined && profile.targetWeightKg === undefined)
  )
    return null;
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const history = sortedWeights(profile).filter(
    (entry) => entry.date >= localDate(start) && entry.date <= localDate(),
  );
  const first = history[0],
    last = history.at(-1);
  const current = last?.kg ?? profile.weightKg;
  const change =
    first && last && history.length > 1
      ? Math.round((last.kg - first.kg) * 10) / 10
      : undefined;
  const minimum = Math.min(...history.map((entry) => entry.kg)) - 0.3;
  const maximum = Math.max(...history.map((entry) => entry.kg)) + 0.3;
  const from = first ? Date.parse(first.date) : 0;
  const duration = last ? Math.max(86400000, Date.parse(last.date) - from) : 1;
  const points = history.map((entry) => ({
    x: 24 + ((Date.parse(entry.date) - from) / duration) * 272,
    y: 18 + ((maximum - entry.kg) / (maximum - minimum)) * 80,
  }));
  return (
    <section className="card weight-goal" aria-labelledby="weight-goal-title">
      <div className="weight-heading">
        <h2 id="weight-goal-title">
          <Flag size={18} />
          Моя цель
        </h2>
        <span>Вес · 30 дней</span>
      </div>
      <div className="weight-numbers">
        <div>
          <span>Сейчас</span>
          <strong>
            {current === undefined ? "—" : kg(current)}
            <small> кг</small>
          </strong>
        </div>
        <div>
          <span>Желаемый вес</span>
          <strong>
            {profile.targetWeightKg === undefined
              ? "—"
              : kg(profile.targetWeightKg)}
            <small> кг</small>
          </strong>
        </div>
      </div>
      {history.length > 1 ? (
        <>
          <p className="weight-change">
            {change === 0
              ? "Без изменений"
              : `${change! > 0 ? "+" : "−"}${kg(Math.abs(change!))} кг`}
            <span> за период</span>
          </p>
          <svg
            className="weight-chart"
            viewBox="0 0 320 125"
            role="img"
            aria-label={`Изменение веса с ${kg(first.kg)} до ${kg(last!.kg)} кг, с ${dateLabel(first.date)} по ${dateLabel(last!.date)}`}
          >
            {[minimum, maximum].map((value, index) => (
              <g key={index}>
                <line
                  x1="24"
                  x2="296"
                  y1={index ? 18 : 98}
                  y2={index ? 18 : 98}
                  stroke="#dce4d5"
                  strokeDasharray="3 5"
                />
                <text
                  x="296"
                  y={index ? 12 : 115}
                  textAnchor="end"
                  fill="#637363"
                  fontSize="10"
                >
                  {kg(value)} кг
                </text>
              </g>
            ))}
            <polyline
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              stroke="#426d50"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
            {points.map((point, index) => (
              <circle
                key={history[index].date}
                cx={point.x}
                cy={point.y}
                r={index === points.length - 1 ? 5 : 3}
                fill="#426d50"
                stroke="#fffdf8"
                strokeWidth="2"
              >
                <title>
                  {dateLabel(history[index].date)}: {kg(history[index].kg)} кг
                </title>
              </circle>
            ))}
          </svg>
          <div className="weight-chart-dates">
            <span>{dateLabel(first.date)}</span>
            <span>{dateLabel(last!.date)}</span>
          </div>
        </>
      ) : (
        <p className="muted weight-empty">
          {last
            ? "Первое измерение есть. Следующее появится на графике."
            : "Запиши первое измерение — здесь появится история веса."}
        </p>
      )}
      {last && (
        <p className="weight-last">
          Последнее измерение · {dateLabel(last.date)}
        </p>
      )}
      <div className="weight-actions">
        <button className="secondary" onClick={() => app.setModal("weight")}>
          <Plus size={17} />
          Записать вес
        </button>
        <button className="text-button" onClick={() => app.setModal("profile")}>
          Изменить цель
        </button>
      </div>
    </section>
  );
}
