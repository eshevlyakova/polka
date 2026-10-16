import { ArrowLeft, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
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
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const elements = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button,input:not([type="hidden"]),select,textarea,a[href],[tabindex="0"]',
          ) ?? [],
        ).filter((el) => !el.hasAttribute("disabled"));
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
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay" onClick={onClose}>
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
          <button type="button" className="back-link" onClick={onClose}>
            <ArrowLeft size={20} />
            Назад
          </button>
          <button
            className="icon-button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        <h2 className="dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
