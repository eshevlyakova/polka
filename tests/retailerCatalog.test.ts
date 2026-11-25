import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  catalogProducts,
  searchProducts,
} from "../apps/backend/src/catalog/repository";
import { nutritionCandidates } from "../shared/nutritionMatching";
import { basicFoods } from "../shared/basicFoods";
import { handleRequest } from "../apps/backend/src/router";

it("rebuilds only the retailer supplement, merges pack sizes and quarantines conflicting nutrition", () => {
  const dir = mkdtempSync(join(tmpdir(), "polka-retail-test-"));
  execFileSync("python3", [
    "apps/backend/scripts/import-retailer-products.py",
    "--input",
    "apps/backend/data/imports/5ka-nutrition-2026-11-24.json",
    "--output-dir",
    dir,
  ]);
  const products = JSON.parse(
    readFileSync(join(dir, "products.retail.json"), "utf8"),
  );
  const report = JSON.parse(
    readFileSync(join(dir, "retailer-import-report.json"), "utf8"),
  );
  expect(products).toHaveLength(15);
  expect(report.acceptedPackages).toBe(16);
  expect(report.rejected).toHaveLength(1);
  expect(report.rejected[0].sourceId).toBe("4217907");
  const cottage = products.find((p: { name: string }) =>
    p.name.includes("ЭкоНива"),
  );
  expect(cottage.packages.map((p: { label: string }) => p.label)).toEqual([
    "300 г",
    "750 г",
  ]);
  expect(cottage.per100.kcal).toBe(121);
  expect(cottage.barcode).toBe(""); // A retailer SKU is not a barcode.
  expect(products).toEqual(
    catalogProducts.filter((p) => p.source.name === "Пятёрочка"),
  );
});
it("makes captured retailer products available to manual search and receipt/voice nutrition matching", async () => {
  const matches = searchProducts("творог Простоквашино 2%");
  expect(
    matches.some((p) => p.per100.kcal === 99 && p.source.name === "Пятёрочка"),
  ).toBe(true);
  const found = nutritionCandidates(
    "Творог Простоквашино 2% 200 г",
    catalogProducts,
    basicFoods,
  );
  expect(
    found.some((p) => p.kind === "label" && p.food.per100.kcal === 99),
  ).toBe(true);
  const response = await handleRequest(
    new Request(
      "https://polka.test/api/catalog/products?q=" +
        encodeURIComponent("Гречка Увелка"),
    ),
    {},
  );
  expect(response.ok).toBe(true);
  const data = await response.json();
  expect(
    data.items.some((p: { per100: { kcal: number } }) => p.per100.kcal === 360),
  ).toBe(true);
});
