import { Archive, Home, NotebookPen, UserRound } from "lucide-react";
import { Dialogs } from "./components/Dialogs";
import { Logo } from "./components/ui";
import { useAppController } from "./hooks/useAppController";
import { DiaryScreen } from "./screens/DiaryScreen";
import { PantryScreen } from "./screens/PantryScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { RecipeScreen } from "./screens/RecipeScreen";
import { PearMascot } from "./components/PearMascot";
import { ProfileScreen } from "./screens/ProfileScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { LibraryRecipeScreen } from "./screens/LibraryRecipeScreen";
import { Modal } from "./components/ui";
import { OnboardingDialog } from "./components/dialogs/OnboardingDialog";
export function App() {
  const app = useAppController();
  const { error, setError, message, setMessage, tab, setTab } = app;
  const welcome = !app.state.settings.onboarded || (app.session?.mode === "account" && app.state.settings.profileConfirmed !== true);
  return (
    <div
      className="app"
      aria-busy={app.saving}
      onKeyDownCapture={(event) => {
        if ((app.saving || app.saveError) && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onClickCapture={(event) => {
        if (
          (app.saving || app.saveError) &&
          !(event.target as Element).closest(".save-recovery")
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onSubmitCapture={(event) => {
        if (app.saving || app.saveError) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {app.saving && (
        <div className="save-status" role="status">
          Сохраняем…
        </div>
      )}
      {!app.selected && !app.libraryOpen && !app.libraryRecipeId && (
        <header className={`top ${tab === "home" ? "home-brand" : ""}`}>
          <div className="brand-lockup">
            <Logo />
            <p className="tagline">Знает, что у тебя есть.</p>
          </div>
          {tab === "home" && !welcome && <PearMascot />}
        </header>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Скрыть ошибку">
            ×
          </button>
        </div>
      )}
      {message && (
        <div className="notice" role="status">
          {message}
          <button onClick={() => setMessage("")} aria-label="Скрыть сообщение">
            ×
          </button>
        </div>
      )}
      <main>
        {app.lastRating && (
          <div className="notice recipe-rating-notice" role="status">
            <span>
              {app.lastRating.rating === "like"
                ? "Учтём твой вкус в следующих идеях."
                : "Убрали рецепт. Учтём, что тебе не понравилось."}
            </span>
            <button
              type="button"
              disabled={app.saving}
              onClick={() =>
                app.removeRecipeRating(
                  app.lastRating!.id,
                  app.lastRating!.previous,
                )
              }
            >
              Отменить
            </button>
            <button
              type="button"
              aria-label="Скрыть оценку"
              onClick={() => app.setLastRating(null)}
            >
              ×
            </button>
          </div>
        )}
        {welcome ? (
          <OnboardingDialog app={app} />
        ) : app.selected ? (
          <RecipeScreen app={app} />
        ) : app.libraryRecipeId ? (
          <LibraryRecipeScreen app={app} />
        ) : app.libraryOpen ? (
          <LibraryScreen app={app} />
        ) : (
          <>
            <HomeScreen app={app} />
            <PantryScreen app={app} />
            <DiaryScreen app={app} />
            <ProfileScreen app={app} />
          </>
        )}
      </main>
      {!welcome &&
        !app.selected &&
        !app.libraryOpen &&
        !app.libraryRecipeId && (
          <nav className="bottom" aria-label="Основная навигация">
            {(
              [
                ["home", Home, "Главная"],
                ["pantry", Archive, "Полка"],
                ["diary", NotebookPen, "Дневник"],
                ["profile", UserRound, "Профиль"],
              ] as const
            ).map(([key, Icon, label]) => (
              <button
                aria-current={tab === key ? "page" : undefined}
                className={tab === key ? "active" : ""}
                key={key}
                onClick={() => {
                  if (key === "home") app.setRecipeFoodId(null);
                  setTab(key);
                }}
              >
                <Icon size={21} />
                {label}
              </button>
            ))}
          </nav>
        )}
      <Dialogs app={app} />
      {app.saveError && (
        <div className="save-recovery">
          <Modal title="Сохранение не подтверждено" onClose={() => {}}>
            <p role="alert">{app.saveError}</p>
            <p>
              Изменения сохранены на этом устройстве. Повторная отправка не
              спишет продукты ещё раз.
            </p>
            <button
              className="primary"
              disabled={app.saving}
              onClick={app.retrySave}
            >
              Повторить сохранение
            </button>
            <a className="text-button" href="https://t.me/polka_food_bot">
              Открыть Telegram заново
            </a>
          </Modal>
        </div>
      )}
    </div>
  );
}
