import { Check, LockKeyhole } from "lucide-react";
import { AchievementArt } from "../components/AchievementArt";
import { ProfileDetails } from "../components/ProfileDetails";
import { getAchievements, type Achievement } from "../domain/achievements";
import type { AppController } from "../hooks/useAppController";

function Badge({ item }: { item: Achievement }) {
  return (
    <article
      className={`achievement-tile ${item.unlocked ? "unlocked" : "locked"}`}
      aria-label={`${item.title}: ${item.unlocked ? "получено" : "ещё впереди"}`}
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
  return (
    <section className="profile-page profile-editorial">
      <header className="profile-page-heading">
        <h1>Мой профиль</h1>
      </header>
      <ProfileDetails app={app} />
      {!!app.state.recipeFeedback?.length && (
        <details className="profile-recipe-ratings">
          <summary>
            Твои оценки рецептов · {app.state.recipeFeedback.length}
          </summary>
          {app.state.recipeFeedback.map((feedback) => (
            <div className="profile-recipe-rating" key={feedback.recipeId}>
              <button
                type="button"
                className="text-button"
                onClick={() => app.openRatedRecipe(feedback.recipeId)}
              >
                {feedback.name}
              </button>
              <span>{feedback.rating === "like" ? "Нравится" : "Не моё"}</span>
              <button
                type="button"
                className="text-button"
                disabled={app.saving}
                aria-label={`Убрать оценку: ${feedback.name}`}
                onClick={() => app.removeRecipeRating(feedback.recipeId)}
              >
                Убрать
              </button>
            </div>
          ))}
        </details>
      )}
      {app.session?.mode === "account" && (
        <div className="account-identity">
          <span>
            Telegram{" "}
            {app.session.user.username
              ? `@${app.session.user.username}`
              : app.session.user.displayName}
          </span>

        </div>
      )}
      <div className="section-title">
        <h2>Твоя коллекция</h2>
        <span className="badge">
          {count} из {achievements.length}
        </span>
      </div>
      <div className="achievements-grid">
        {achievements.map((item) => (
          <Badge key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
