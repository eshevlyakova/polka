import { useEffect, useRef, useState } from "react";
import type {
  LibrarySearch,
  LibraryPage,
} from "../../../../shared/recipeLibrary";
import { fetchLibraryPage } from "../api/recipeLibrary";
export function useRecipeLibrary(excludedIds: string[] = []) {
  const [request, setRequest] = useState<LibrarySearch | null>(null);
  const [page, setPage] = useState<LibraryPage | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null),
    sequence = useRef(0);
  useEffect(() => () => pending.current?.abort(), []);
  async function search(input: LibrarySearch, append = false) {
    input = {
      ...input,
      excludedRecipeIds: append ? input.excludedRecipeIds : excludedIds,
    };
    pending.current?.abort();
    const version = ++sequence.current,
      controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    if (!append) {
      setRequest({ ...input, offset: 0 });
      setPage(null);
    }
    try {
      const next = await fetchLibraryPage(input, controller.signal);
      if (version !== sequence.current || controller.signal.aborted) return;
      setPage((prev) =>
        append && prev
          ? {
              ...next,
              items: [
                ...prev.items,
                ...next.items.filter(
                  (i) => !prev.items.some((p) => p.id === i.id),
                ),
              ],
            }
          : next,
      );
      return next;
    } catch (err) {
      if (!controller.signal.aborted)
        setError((err as Error).message || "Не удалось загрузить рецепты.");
    } finally {
      if (version === sequence.current) {
        setBusy(false);
        pending.current = null;
      }
    }
  }
  function more() {
    if (request && page && !busy && page.offset + page.limit < page.total)
      void search({ ...request, offset: page.offset + page.limit }, true);
  }
  function cancel() {
    pending.current?.abort();
    pending.current = null;
    ++sequence.current;
    setBusy(false);
  }
  function clear() {
    cancel();
    setRequest(null);
    setPage(null);
    setError("");
  }
  const removed =
    page?.items.filter((r) => excludedIds.includes(r.id)).length ?? 0;
  const visiblePage =
    page && removed
      ? {
          ...page,
          items: page.items.filter((r) => !excludedIds.includes(r.id)),
          total: page.total - removed,
        }
      : page;
  return {
    request,
    page: visiblePage,
    busy,
    error,
    setError,
    search,
    more,
    cancel,
    clear,
  };
}
