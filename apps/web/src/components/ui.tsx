import { ArrowLeft, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Nutrients } from "../domain/model";
export function Logo() {
  return (
    <div className="logo" aria-label="Полка">
      <span>Полка</span>
      <i className="leaf one" />
      <i className="leaf two" />
    </div>
  );
}
export function Macros({ n }: { n: Nutrients }) {
  return (
    <div className="macros">
      <span>
        <b>{Math.round(n.kcal)}</b> ккал
      </span>
      <span>
        <b>{n.protein.toFixed(1)}</b> белки
      </span>
      <span>
        <b>{n.fat.toFixed(1)}</b> жиры
      </span>
      <span>
        <b>{n.carbs.toFixed(1)}</b> углеводы
      </span>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  onBack,
  confirmClose = false,
  onClosingDraft,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  confirmClose?: boolean;
  onClosingDraft?: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const [confirming, setConfirming] = useState(false);
  function requestClose() {
    if (!confirmClose) return onClose();
    onClosingDraft?.();
    setConfirming(true);
  }
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;
  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const element = panel.current;
    function back() {
      (backRef.current ?? closeRef.current)();
    }
    element?.addEventListener("polka:back", back);
    function key(event: KeyboardEvent) {
      if (
        Array.from(document.querySelectorAll('[aria-modal="true"]')).at(-1) !==
        element
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const elements = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button,input:not([type="hidden"]),select,textarea,a[href],[tabindex="0"]',
          ) ?? [],
        ).filter(
          (el) =>
            !el.hasAttribute("disabled") && el.getClientRects().length > 0,
        );
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      element?.removeEventListener("polka:back", back);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay" onClick={requestClose}>
      <section
        className="modal"
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-nav">
          {onBack && (
            <button type="button" className="back-link" onClick={onBack}>
              <ArrowLeft size={20} />
              Назад
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Закрыть"
            onClick={requestClose}
          >
            <X size={22} />
          </button>
        </div>
        <h2 className="dialog-title">{title}</h2>
        {children}
        {confirming && (
          <Modal
            title="Закрыть список продуктов?"
            onClose={() => setConfirming(false)}
          >
            <p>Продукты из этого списка ещё не добавлены на полку.</p>
            <button
              type="button"
              className="primary"
              onClick={() => setConfirming(false)}
            >
              Продолжить со списком
            </button>
            <button type="button" className="text-button" onClick={onClose}>
              Закрыть без добавления
            </button>
          </Modal>
        )}
      </section>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
