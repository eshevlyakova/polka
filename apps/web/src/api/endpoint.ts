/** Supports a same-origin container, a separate HTTP API, and legacy functions. */
export function apiEndpoint(
  path: string,
  base = import.meta.env.VITE_AI_API_URL,
): string | null {
  if (!base) return import.meta.env.DEV ? path : null;
  const url = new URL(base, location.origin);
  if (url.pathname.endsWith("/api/ai/recipes"))
    url.pathname = url.pathname.replace(/\/api\/ai\/recipes$/, path);
  else url.searchParams.set("route", path);
  return url.toString();
}
