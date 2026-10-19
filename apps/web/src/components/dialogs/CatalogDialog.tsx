import { Modal } from "../ui";
import { CustomFoodForm } from "./CustomFoodForm";
import type { AppController } from "../../hooks/useAppController";
export function CatalogDialog({ app }: { app: AppController }) {
  if (app.modal !== "catalog") return null;
  return (
    <Modal title="Новый продукт" onClose={() => app.setModal(null)}>
      <CustomFoodForm
        app={app}
        onCreated={(food) => {
          app.setMessage(
            "Продукт создан. Укажи количество, чтобы добавить его на полку.",
          );
          app.openPantry(food.id);
        }}
      />
    </Modal>
  );
}
