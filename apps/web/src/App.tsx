import { Archive, ChefHat, Home, NotebookPen, UserRound } from "lucide-react";
import { Dialogs } from "./components/Dialogs";
import { Logo } from "./components/ui";
import { useAppController } from "./hooks/useAppController";
import { DiaryScreen } from "./screens/DiaryScreen";
import { PantryScreen } from "./screens/PantryScreen";
import { RecipesScreen } from "./screens/RecipesScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { TodayScreen } from "./screens/TodayScreen";
export function App() {
  const app = useAppController();
  const { error, setError, message, setMessage, tab, setTab } = app;
  return (
    <div className="app">
      <header className="top">
        <div className="brand-lockup">
          <Logo />
          <p className="tagline">Знает, что у тебя есть.</p>
        </div>
      </header>
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
        <TodayScreen app={app} />
        <PantryScreen app={app} />
        <RecipesScreen app={app} />
        <DiaryScreen app={app} />
        <ProfileScreen app={app} />
      </main>
      <nav className="bottom" aria-label="Основная навигация">
        {(
          [
            ["today", Home, "Сегодня"],
            ["pantry", Archive, "Полка"],
            ["recipes", ChefHat, "Рецепты"],
            ["diary", NotebookPen, "Дневник"],
            ["profile", UserRound, "Профиль"],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            aria-current={tab === key ? "page" : undefined}
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            <Icon size={21} />
            {label}
          </button>
        ))}
      </nav>
      <Dialogs app={app} />
    </div>
  );
}
