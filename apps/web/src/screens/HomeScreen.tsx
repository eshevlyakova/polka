import { ReadyMeals } from "../components/ReadyMeals";
import { PersonalIdeas } from "../components/PersonalIdeas";
import { ArrowLeft, ChefHat, Plus, X } from "lucide-react";
import { AiRecipesPanel } from "../components/AiRecipesPanel";
import type { AppController } from "../hooks/useAppController";

export function HomeScreen({ app }: { app: AppController }) {
  if (app.tab !== "home") return null;
  const { state, recipeFoodId, setRecipeFoodId, foodName } = app;
  const hasProducts = state.pantry.some((p) => p.grams > 1e-6);
  return (
    <section className="home-page">
      {recipeFoodId && (
        <section
          className="recipe-product-filter"
          aria-label="Подборка по продукту"
        >
          <div>
            <ChefHat size={21} />
            <span>
              Рецепты с продуктом<strong>{foodName(recipeFoodId)}</strong>
            </span>
            <button
              className="icon-button"
              aria-label="Сбросить фильтр по продукту"
              onClick={() => setRecipeFoodId(null)}
            >
              <X size={19} />
            </button>
          </div>
          <button
            className="text-button"
            onClick={() => {
              setRecipeFoodId(null);
              app.setTab("pantry");
            }}
          >
            <ArrowLeft size={16} />К полке
          </button>
        </section>
      )}
      {hasProducts ? (
        <AiRecipesPanel app={app} />
      ) : (
        <section
          className="home-empty-pantry"
          aria-labelledby="empty-pantry-title"
        >
          <span className="home-empty-eyebrow">Твоя полка</span>
          <h1 id="empty-pantry-title">Начнём с твоих продуктов</h1>
          <p>Добавь то, что есть дома — подберём, что приготовить.</p>
          <button className="primary" onClick={() => app.openPantry()}>
            <Plus size={19} />
            Добавить продукты
          </button>
        </section>
      )}
      <ReadyMeals app={app} />
      <PersonalIdeas app={app} />
    </section>
  );
}
