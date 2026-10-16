import { inputNumber } from "../domain/input";
import type { AppController } from "../hooks/useAppController";
export function ProfilePreferences({ app }: { app: AppController }) {
  const { state, commit, form, setMessage } = app;
  return (
    <section className="settings-page" id="profile-preferences" tabIndex={-1}>
      <h2>Под себя</h2>
      <p className="muted">Цель питания и предпочтения для рецептов.</p>
      <form
        onSubmit={form((d) => {
          commit({
            ...state,
            settings: {
              ...state.settings,
              calorieGoal: inputNumber(d, "goal"),
              exclusions: String(d.get("exclusions")),
            },
          });
          setMessage("Настройки сохранены");
        })}
      >
        <label>
          Моя цель, ккал (0 — без цели)
          <input
            name="goal"
            type="number"
            min="0"
            defaultValue={state.settings.calorieGoal}
          />
        </label>
        <label>
          Исключить названия через запятую
          <input
            name="exclusions"
            defaultValue={state.settings.exclusions}
            placeholder="молоко, творог"
          />
        </label>
        <p className="muted">
          Фильтр по названию не гарантирует отсутствие аллергенов. Проверяй
          состав.
        </p>
        <button className="primary">Сохранить</button>
      </form>
    </section>
  );
}
