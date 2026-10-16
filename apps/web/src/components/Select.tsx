import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: ReactNode };
// Shared picker: native form values, custom presentation and keyboard navigation.
export function Select({
  children,
  value,
  defaultValue,
  name,
  required,
  onChange,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  name?: string;
  required?: boolean;
  onChange?: (event: { target: { value: string } }) => void;
  "aria-label"?: string;
}) {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (
      isValidElement<{ value?: string | number; children: ReactNode }>(child)
    ) {
      options.push({
        value: String(child.props.value ?? child.props.children),
        label: child.props.children,
      });
    }
  });
  const [stored, setStored] = useState(
    String(defaultValue ?? options[0]?.value ?? ""),
  );
  const selected =
    options.find((o) => o.value === String(value ?? stored)) ?? options[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, id]);
  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    setStored(option.value);
    setOpen(false);
    onChange?.({ target: { value: option.value } });
  }
  function expand() {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === selected?.value),
      ),
    );
    setOpen(true);
  }
  return (
    <span
      className="custom-select"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      {name && (
        <input type="hidden" name={name} value={selected?.value ?? ""} />
      )}
      <button
        type="button"
        className="select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        aria-required={required}
        disabled={!options.length}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : expand())}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          } else if (event.key === "Tab") setOpen(false);
          else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) expand();
            else
              setActive(
                (index) =>
                  (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    options.length) %
                  options.length,
              );
          } else if (open && (event.key === "Home" || event.key === "End")) {
            event.preventDefault();
            setActive(event.key === "Home" ? 0 : options.length - 1);
          } else if (open && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            choose(active);
          } else if (open && event.key.length === 1) {
            const index = options.findIndex((o) =>
              String(o.label)
                .toLocaleLowerCase()
                .startsWith(event.key.toLocaleLowerCase()),
            );
            if (index >= 0) {
              event.preventDefault();
              setActive(index);
            }
          }
        }}
      >
        <span>{selected?.label ?? "Ничего не найдено"}</span>
        <ChevronDown size={19} aria-hidden="true" />
      </button>
      {open && (
        <span
          className="select-options"
          role="listbox"
          id={`${id}-list`}
          aria-label={ariaLabel}
        >
          {options.map((option, index) => (
            <span
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={option.value === selected?.value}
              className={`select-option${index === active ? " highlighted" : ""}`}
              onPointerDown={(event) => event.preventDefault()}
              onPointerMove={() => setActive(index)}
              onClick={(event) => {
                event.preventDefault();
                choose(index);
              }}
            >
              <span>{option.label}</span>
              {option.value === selected?.value && (
                <Check size={18} aria-hidden="true" />
              )}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
