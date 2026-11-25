import { useEffect, useRef, useState } from "react";

/** Keep only successfully rated cards briefly mounted for their exit transition. */
export function useRecipePresence<T extends { id: string }>(
  items: T[],
  isRated: (id: string) => boolean,
) {
  const latest = useRef({ items, isRated });
  latest.current = { items, isRated };
  const signature = items.map((item) => item.id).join("|");
  const [entries, setEntries] = useState(() =>
    items.map((item) => ({ item, leaving: false })),
  );
  useEffect(() => {
    const current = latest.current;
    setEntries((previous) => {
      const next = current.items.map((item) => ({ item, leaving: false }));
      for (const [index, entry] of previous.entries()) {
        if (
          !current.items.some((item) => item.id === entry.item.id) &&
          current.isRated(entry.item.id)
        )
          next.splice(Math.min(index, next.length), 0, {
            ...entry,
            leaving: true,
          });
      }
      return next;
    });
    const timer = setTimeout(
      () =>
        setEntries((previous) => previous.filter((entry) => !entry.leaving)),
      260,
    );
    return () => clearTimeout(timer);
  }, [signature]);
  const visible = items.map((item) => ({ item, leaving: false }));
  for (const [index, entry] of entries.entries()) {
    if (
      !items.some((item) => item.id === entry.item.id) &&
      isRated(entry.item.id)
    )
      visible.splice(Math.min(index, visible.length), 0, {
        ...entry,
        leaving: true,
      });
  }
  return visible;
}
