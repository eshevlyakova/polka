import { useState, useEffect } from "react";
import {
  searchCatalogProducts,
  type CatalogMatch,
} from "../api/catalogProducts";
export function useCatalogLookup(query: string, enabled: boolean) {
  const [remote, setRemote] = useState<CatalogMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  useEffect(() => {
    setRemote([]);
    setSearchError("");
    const shouldSearch = enabled && query.trim().length >= 2;
    setBusy(shouldSearch);
    if (!shouldSearch) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const matches = await searchCatalogProducts(
          query.trim(),
          controller.signal,
        );
        if (!controller.signal.aborted) setRemote(matches);
      } catch (err) {
        if (!controller.signal.aborted) setSearchError((err as Error).message);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);
  return { remote, busy, searchError };
}
