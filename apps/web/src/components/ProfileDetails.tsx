import { Pencil } from "lucide-react";
import type { AppController } from "../hooks/useAppController";
import { ProfilePearArt } from "./ProfilePearArt";
import { telegram } from "../telegram";

export function ProfileDetails({ app }: { app: AppController }) {
  const profile = app.state.profile;
  const name =
    profile?.name ||
    (app.session?.mode === "account" ? app.session.user.displayName : "") ||
    telegram?.initDataUnsafe?.user?.first_name?.trim() ||
    "Твой профиль";
  const age = profile?.age;
  const ageUnit =
    age !== undefined && age % 10 === 1 && age % 100 !== 11
      ? "год"
      : age !== undefined &&
          [2, 3, 4].includes(age % 10) &&
          ![12, 13, 14].includes(age % 100)
        ? "года"
        : "лет";
  const details = [
    age === undefined ? null : `${age} ${ageUnit}`,
    profile?.heightCm === undefined
      ? null
      : `${profile.heightCm.toLocaleString("ru")} см`,
  ]
    .filter(Boolean)
    .join(" · ");
  const days = new Set(app.state.diary.map((entry) => entry.date)).size;
  return (
    <section
      className="profile-identity"
      aria-labelledby="profile-details-title"
    >
      <div className="profile-identity-top">
        <div className="profile-identity-copy">
          <h2 id="profile-details-title">О тебе</h2>
          <p
            className="profile-display-name"
            data-long-name={name.length > 22 || undefined}
            title={name}
            aria-label={name}
          >
            {name
              .trim()
              .split(/\s+/)
              .map((word, index) => (
                <span key={index}>
                  {index > 0 && " "}
                  <span className="profile-name-word">{word}</span>
                </span>
              ))}
          </p>
          {details && <p className="profile-personal-line">{details}</p>}
          <button
            className="text-button"
            onClick={() => app.setModal("profile")}
          >
            <Pencil size={14} />
            Изменить
          </button>
        </div>
        <div className="profile-identity-art">
          <ProfilePearArt />
        </div>
      </div>
      <dl className="profile-activity">
        <div>
          <dd>{days}</dd>
          <dt>дней с записями</dt>
        </div>
        <div>
          <dd>{app.state.batches.length}</dd>
          <dt>блюд приготовлено</dt>
        </div>
      </dl>
    </section>
  );
}
