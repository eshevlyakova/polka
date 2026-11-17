import { useState } from "react";
export function toDateText(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? iso.split("-").reverse().join(".")
    : iso;
}
export function fromDateText(text: string) {
  return /^\d{2}\.\d{2}\.\d{4}$/.test(text)
    ? text.split(".").reverse().join("-")
    : text;
}
/** Text entry deliberately avoids the browser's native date popover. */
export function DateInput({
  name = "date",
  value,
  onChange,
}: {
  name?: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  const [text, setText] = useState(toDateText(value));
  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        placeholder="ДД.ММ.ГГГГ"
        maxLength={10}
        pattern={"[0-9]{2}\\.[0-9]{2}\\.[0-9]{4}"}
        value={text}
        required
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
          const next = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
            .filter(Boolean)
            .join(".");
          setText(next);
          onChange?.(fromDateText(next));
        }}
      />
      <input type="hidden" name={name} value={fromDateText(text)} />
    </>
  );
}
