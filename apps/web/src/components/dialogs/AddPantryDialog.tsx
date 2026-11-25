import { ScanLine, Pencil, ArrowUpRight, Mic } from "lucide-react";
import { Modal } from "../ui";
import type { AppController } from "../../hooks/useAppController";
export function AddPantryDialog({ app }: { app: AppController }) {
  if (app.modal !== "add-pantry") return null;
  return (
    <Modal title="Пополнить полку" onClose={() => app.setModal(null)}>
      <div className="add-pantry-choices">
        <button
          className="add-choice voice-choice"
          onClick={() => app.setModal("voice")}
        >
          <span className="choice-icon">
            <Mic size={26} />
          </span>
          <span>
            <strong>Голосом</strong>
            <small>Назови продукты — соберём список</small>
          </span>
          <ArrowUpRight size={21} />
        </button>
        <button
          className="add-choice scan-choice"
          onClick={() => app.setModal("receipt")}
        >
          <span className="choice-icon">
            <ScanLine size={26} />
          </span>
          <span>
            <strong>По чеку</strong>
            <small>Фото или скриншот покупок</small>
          </span>
          <ArrowUpRight size={21} />
        </button>
        <button className="add-choice" onClick={() => app.setModal("pantry")}>
          <span className="choice-icon">
            <Pencil size={23} />
          </span>
          <span>
            <strong>Вручную</strong>
            <small>Выбрать продукт и количество</small>
          </span>
          <ArrowUpRight size={21} />
        </button>
      </div>
    </Modal>
  );
}
