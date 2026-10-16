import {
  Pencil,
  UserRound,
  Ruler,
  Scale,
  Flag,
  CalendarDays,
} from "lucide-react";
import type { AppController } from "../hooks/useAppController";
import { telegram } from "../telegram";

export function ProfileDetails({ app }: { app: AppController }) {
  const profile = app.state.profile;
  const name =
    profile?.name || telegram?.initDataUnsafe?.user?.first_name?.trim();
  const format = (value: number | undefined, unit: string) =>
    value === undefined ? "Не указан" : `${value.toLocaleString("ru")} ${unit}`;
  const age = profile?.age;
  const ageUnit =
    age !== undefined && age % 10 === 1 && age % 100 !== 11
      ? "год"
      : age !== undefined &&
          [2, 3, 4].includes(age % 10) &&
          ![12, 13, 14].includes(age % 100)
        ? "года"
        : "лет";
  return (
    <section
      className="profile-details card"
      aria-labelledby="profile-details-title"
    >
      <div className="profile-details-heading">
        <h2 id="profile-details-title">О тебе</h2>
        <button className="text-button" onClick={() => app.setModal("profile")}>
          <Pencil size={16} />
          Изменить
        </button>
      </div>
      <div className="profile-person">
        <span className="profile-avatar">
          <UserRound size={26} />
        </span>
        <div>
          <span className="profile-field-label">Имя</span>
          <strong>{name || "Как тебя зовут?"}</strong>
        </div>
      </div>
      <dl className="profile-measurements">
        <div>
          <dt>
            <CalendarDays size={17} />
            Возраст
          </dt>
          <dd>{format(age, ageUnit)}</dd>
        </div>
        <div>
          <dt>
            <Ruler size={17} />
            Рост
          </dt>
          <dd>{format(profile?.heightCm, "см")}</dd>
        </div>
        <div>
          <dt>
            <Scale size={17} />
            Текущий вес
          </dt>
          <dd>{format(profile?.weightKg, "кг")}</dd>
        </div>
        <div className="profile-target">
          <dt>
            <Flag size={17} />
            Желаемый вес
          </dt>
          <dd>{format(profile?.targetWeightKg, "кг")}</dd>
        </div>
      </dl>
    </section>
  );
}
