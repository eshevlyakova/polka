import {
  Check,
  ChefHat,
  LockKeyhole,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { AchievementArt } from "../components/AchievementArt";
import { ProfileDetails } from "../components/ProfileDetails";
import { ProfilePreferences } from "../components/ProfilePreferences";
import { PearMascot } from "../components/PearMascot";
import { getAchievements, type Achievement } from "../domain/achievements";
import type { AppController } from "../hooks/useAppController";

function Badge({ item }: { item: Achievement }) {
  return (
    <article
      className={`achievement-tile ${item.unlocked ? "unlocked" : "locked"}`}
    >
      <div className={`achievement-medal medal-${item.id}`} aria-hidden="true">
        <AchievementArt kind={item.id} />
        <span className="medal-spark">✦</span>
        <span className="medal-status">
          {item.unlocked ? <Check size={13} /> : <LockKeyhole size={12} />}
        </span>
      </div>
      <span className="achievement-status">
        {item.unlocked ? "Получено" : "Впереди"}
      </span>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <div className="achievement-progress">
        <progress
          value={item.current}
          max={item.target}
          aria-label={`${item.title}: ${item.current} из ${item.target}`}
        />
        <span>
          {item.current} / {item.target}
        </span>
      </div>
    </article>
  );
}
export function ProfileScreen({ app }: { app: AppController }) {
  if (app.tab !== "profile") return null;
  const achievements = getAchievements(app.state);
  const count = achievements.filter((item) => item.unlocked).length;
  const days = new Set(app.state.diary.map((entry) => entry.date)).size;
  return (
    <section className="profile-page">
      <div className="profile-heading">
        <div>
          <h1>Мой профиль</h1>
        </div>
        <PearMascot pose="proud" message={<>Это всё ты!</>} />
      </div>
      <div className="profile-stats">
        <div>
          <NotebookPen size={20} />
          <strong>{days}</strong>
          <span>дней с записями</span>
        </div>
        <div>
          <ChefHat size={20} />
          <strong>{app.state.batches.length}</strong>
          <span>блюд приготовлено</span>
        </div>
        <div>
          <Sparkles size={20} />
          <strong>
            {count} / {achievements.length}
          </strong>
          <span>достижений</span>
        </div>
      </div>
      <ProfileDetails app={app} />
      <div className="section-title">
        <h2>Твоя коллекция</h2>
        <span className="badge">{count} открыто</span>
      </div>
      <div className="achievements-grid">
        {achievements.map((item) => (
          <Badge key={item.id} item={item} />
        ))}
      </div>
      <ProfilePreferences app={app} />
    </section>
  );
}
