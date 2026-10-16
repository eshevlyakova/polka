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
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const profile = updateProfile(
              app.state.profile,
              profileFromForm(new FormData(event.currentTarget)),
            );
            app.commit({ ...app.state, profile });
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
            maxLength={60}
            autoComplete="given-name"
            defaultValue={
              app.state.profile?.name ??
              telegram?.initDataUnsafe?.user?.first_name ??
              ""
            }
            placeholder="Как тебя зовут?"
          />
        </label>
        <div className="fields">
          {profileFields.map((field) => (
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
