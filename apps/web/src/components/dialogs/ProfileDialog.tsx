import { updateProfile } from "../../domain/weight";
import { useState } from "react";
import { Modal } from "../ui";
import { profileFields, profileFromForm } from "../../domain/profile";
import type { AppController } from "../../hooks/useAppController";
import { telegram } from "../../telegram";

export function ProfileDialog({ app }: { app: AppController }) {
  return app.modal === "profile" ? <ProfileForm app={app} /> : null;
}
function ProfileForm({ app }: { app: AppController }) {
  const [error, setError] = useState("");
  return (
    <Modal title="Данные профиля" onClose={() => app.setModal(null)}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const edited = profileFromForm(new FormData(event.currentTarget));
            if (!edited.name) throw new Error("Укажи имя.");
            const profile = updateProfile(app.state.profile, {
              ...app.state.profile,
              ...edited,
              age: edited.age,
              heightCm: edited.heightCm,
              weightKg: edited.weightKg,
            });
            await app.commit({ ...app.state, profile });
            app.setModal(null);
            app.setMessage("Профиль сохранён");
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
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
              app.state.profile?.name ??
              (app.session?.mode === "account"
                ? app.session.user.displayName
                : undefined) ??
              telegram?.initDataUnsafe?.user?.first_name ??
              ""
            }
            placeholder="Как тебя зовут?"
          />
        </label>
        <div className="fields">
          {profileFields
            .filter(
              (field) =>
                field.key !== "targetWeightKg",
            )
            .map((field) => (
              <label key={field.key}>
                {field.label}, {field.unit}
                <input
                  name={field.key}
                  type="number"
                  inputMode={field.key === "age" ? "numeric" : "decimal"}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  defaultValue={app.state.profile?.[field.key] ?? ""}
                  placeholder="Не указан"
                />
              </label>
            ))}
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="primary">Сохранить профиль</button>
      </form>
    </Modal>
  );
}
