import { Modal } from "../../components/ui";

import type { AppController } from "../../hooks/useAppController";
export function OnboardingDialog({ app }: { app: AppController }) {
  const { state, commit, run } = app;
  return (
    <>
      {!state.settings.onboarded && (
        <Modal
          title="Привет, это Полка"
          onClose={() =>
            run(() =>
              commit({
                ...state,
                settings: { ...state.settings, onboarded: true },
              }),
            )
          }
        >
          <p>
            Записывай еду или готовь из своих продуктов. Полный холодильник
            вводить не нужно.
          </p>
          <p className="muted">
            Данные хранятся только на этом устройстве. Расчёты зависят от
            состава и указанных количеств.
          </p>
          <button
            className="primary"
            onClick={() =>
              run(() =>
                commit({
                  ...state,
                  settings: { ...state.settings, onboarded: true },
                }),
              )
            }
          >
            Начать
          </button>
        </Modal>
      )}
    </>
  );
}
