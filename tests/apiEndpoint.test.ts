// @vitest-environment jsdom
import { expect, it } from "vitest";
import { apiEndpoint } from "../apps/web/src/api/endpoint";

it("resolves all API routes on the same origin for the container build", () => {
  for (const path of [
    "/api/ai/recipes",
    "/api/ai/receipt",
    "/api/library/search",
    "/api/catalog/products",
    "/api/catalog/nutrition-match",
  ])
    expect(apiEndpoint(path, "/api/ai/recipes")).toBe(
      `${location.origin}${path}`,
    );
});

it("preserves a separately deployed API and its path prefix", () => {
  expect(
    apiEndpoint("/api/ai/receipt", "https://api.polka.test/v1/api/ai/recipes"),
  ).toBe("https://api.polka.test/v1/api/ai/receipt");
});

it("keeps legacy cloud-function query routing", () => {
  const url = new URL(
    apiEndpoint("/api/catalog/products", "https://function.test/id?version=1")!,
  );
  expect(url.origin).toBe("https://function.test");
  expect(url.searchParams.get("route")).toBe("/api/catalog/products");
  expect(url.searchParams.get("version")).toBe("1");
});
