import type { Food } from "../domain/model";
import { apiEndpoint } from "./endpoint";
export type CatalogMatch = {
  id: string;
  name: string;
  brand: string;
  barcode: string;
  basis: string;
  per100: Food["per100"];
  source: { url: string };
};
export async function searchCatalogProducts(
  query: string,
  signal: AbortSignal,
): Promise<CatalogMatch[]> {
  const endpoint = apiEndpoint("/api/catalog/products");
  if (!endpoint) return [];
  const url = new URL(endpoint, location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(
      "Общая база временно недоступна. Можно выбрать типовой продукт или добавить свой.",
    );
  const data = await response.json();
  if (
    !Array.isArray(data.items) ||
    data.items.some(
      (p: CatalogMatch) =>
        !p?.id ||
        typeof p.name !== "string" ||
        !p.per100 ||
        !["kcal", "protein", "fat", "carbs"].every(
          (k) =>
            typeof p.per100[k as keyof Food["per100"]] === "number" &&
            Number.isFinite(p.per100[k as keyof Food["per100"]]) &&
            p.per100[k as keyof Food["per100"]] >= 0,
        ),
    )
  )
    throw new Error("Не удалось проверить данные каталога.");
  return data.items;
}
