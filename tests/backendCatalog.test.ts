import { expect, it } from "vitest";
import { handleRequest } from "../apps/backend/src/router";
import {
  catalogProducts,
  catalogRecipes,
  recipeReferences,
} from "../apps/backend/src/catalog/repository";
const env = { ALLOWED_ORIGIN: "https://front.test" };
const get = (path: string) =>
  handleRequest(
    new Request(`https://api.test${path}`, {
      headers: { Origin: "https://front.test" },
    }),
    env,
  );
it("ships 100 distinct source recipes and complete branded nutrition records", () => {
  expect(catalogRecipes).toHaveLength(100);
  expect(new Set(catalogRecipes.map((r) => r.id)).size).toBe(100);
  for (const r of catalogRecipes) {
    expect(r.ingredientsText.length).toBeGreaterThan(0);
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.originalMarkdown).toContain("Ingredients");
    expect(r.source.url).toMatch(/^https:\/\/based.cooking\//);
    expect(r.source.license).toBe("Unlicense");
    expect(r.nameRu).toBeTruthy();
  }
  expect(catalogProducts.length).toBeGreaterThan(100);
  expect(new Set(catalogProducts.map((p) => p.barcode)).size).toBe(
    catalogProducts.length,
  );
  for (const p of catalogProducts) {
    expect(
      Object.values(p.per100).every((n) => Number.isFinite(n) && n >= 0),
    ).toBe(true);
    expect(p.source.url).toContain(p.barcode);
    expect(p.verification).toBe("community-unverified");
  }
});
it("serves pagination and exact barcode lookup without raw source Markdown or credentials", async () => {
  const page = await (
    await get("/api/catalog/recipes?limit=7&offset=4")
  ).json();
  expect(page.total).toBe(100);
  expect(page.items).toHaveLength(7);
  expect(page.items[0]).not.toHaveProperty("originalMarkdown");
  const code = catalogProducts[0].barcode;
  const found = await (
    await get(`/api/catalog/products?barcode=${code}`)
  ).json();
  expect(found.items).toHaveLength(1);
  expect(found.items[0].barcode).toBe(code);
  expect(found.attribution).toContain("ODbL");
  expect((await get("/api/catalog/products?barcode=123")).status).toBe(400);
  expect((await get("/api/catalog/recipes?limit=9999")).status).toBe(400);
  expect((await get("/api/catalog/recipes/bc-unknown")).status).toBe(404);
});
it("searches Russian recipe titles and retrieves bilingual references for AI", async () => {
  const result = await (
    await get(`/api/catalog/recipes?q=${encodeURIComponent("гречка")}`)
  ).json();
  expect(
    result.items.some((r: { id: string }) => r.id === "bc-merchants-buckwheat"),
  ).toBe(true);
  expect(
    recipeReferences(["Куриная грудка"], "", "").some((r) =>
      r.name.includes("Кури"),
    ),
  ).toBe(true);
  expect(recipeReferences(["Куриная грудка"], "", "курица")).toEqual([]);
});
it("rejects disallowed origins and mutation of the shared catalog", async () => {
  expect(
    (
      await handleRequest(
        new Request("https://api.test/api/catalog/products", {
          headers: { Origin: "https://other.test" },
        }),
        env,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handleRequest(
        new Request("https://api.test/api/catalog/products", {
          method: "POST",
        }),
        env,
      )
    ).status,
  ).toBe(405);
});
