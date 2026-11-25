import { useState } from "react";
import { profileFromForm } from "../../domain/profile";
import { Mic, ScanLine, Pencil, ArrowRight } from "lucide-react";
import { PearMascot } from "../PearMascot";

import type { AppController } from "../../hooks/useAppController";
export function OnboardingDialog({ app }: { app: AppController }) {
  const { state, commit, run } = app;
  const [confirmed, setConfirmed] = useState(
    app.session?.mode !== "account" ||
      (Boolean(state.profile?.name?.trim()) &&
        app.session.repository.snapshot.revision > 0),
  );
  const [profileError, setProfileError] = useState("");
  function begin(modal: "voice" | "receipt" | "pantry" | null) {
    run(async () => {
      await commit({
        ...state,
        settings: { ...state.settings, onboarded: true },
      });
      if (modal) app.setModal(modal);
    });
  }
  if (state.settings.onboarded) return null;
  if (!confirmed)
    return (
      <section className="welcome-screen welcome-profile">
        <span className="section-eyebrow">Привет, это Полка</span>
        <h1>Как тебя называть?</h1>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const profile = profileFromForm(
                new FormData(event.currentTarget),
              );
              if (!profile.name)
                throw new Error("Укажи имя, чтобы продолжить.");
              await commit({
                ...state,
                profile: {
                  ...state.profile,
                  ...profile,
                  heightCm: profile.heightCm,
                  weightKg: profile.weightKg,
                },
              });
              setConfirmed(true);
            } catch (error) {
              setProfileError(
                error instanceof Error
                  ? error.message
                  : "Не удалось сохранить профиль",
              );
            }
          }}
        >
          <label>
            Имя
            <input
              name="name"
              required
              maxLength={60}
              autoComplete="given-name"
              defaultValue={
                state.profile?.name ||
                (app.session?.mode === "account"
                  ? app.session.user.displayName.slice(0, 60)
                  : "")
              }
            />
          </label>
          <div className="fields">
            <label>
              Рост, см
              <input
                name="heightCm"
                type="text"
                inputMode="decimal"
                placeholder="По желанию"
                defaultValue={state.profile?.heightCm ?? ""}
              />
            </label>
            <label>
              Вес, кг
              <input
                name="weightKg"
                type="text"
                inputMode="decimal"
                placeholder="По желанию"
                defaultValue={state.profile?.weightKg ?? ""}
              />
            </label>
          </div>
          {profileError && (
            <p className="notice error" role="alert">
              {profileError}
            </p>
          )}
          <button type="submit" className="primary" disabled={app.saving}>
            Продолжить <ArrowRight size={18} />
          </button>
        </form>
      </section>
    );
  return (
    <section className="welcome-screen" aria-labelledby="welcome-title">
      <div className="welcome-illustration">
        <PearMascot />
        <span className="welcome-orbit" aria-hidden="true" />
      </div>
      <span className="section-eyebrow">Начнём с твоих продуктов</span>
      <h1 id="welcome-title">
        Что есть дома?
        <br />
        Из этого и приготовим.
      </h1>
      <p>
        Добавь несколько продуктов — Полка подберёт рецепты. Весь холодильник
        заполнять не нужно.
      </p>
      <div className="welcome-actions">
        <button className="primary" onClick={() => begin("voice")}>
          <Mic size={20} /> Назвать продукты голосом <ArrowRight size={18} />
        </button>
        <button
          className="primary cancel-action"
          onClick={() => begin("receipt")}
        >
          <ScanLine size={20} /> Добавить по чеку
        </button>
        <button className="welcome-manual" onClick={() => begin("pantry")}>
          <Pencil size={17} /> Ввести вручную
        </button>
      </div>
      <button className="text-button" onClick={() => begin(null)}>
        Позже
      </button>
    </section>
  );
}
