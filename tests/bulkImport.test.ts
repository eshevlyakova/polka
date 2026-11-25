import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseLibrarySearch, searchLibrary } from "../shared/librarySearch";
import { libraryQuantity, type LibraryRecipe } from "../shared/recipeLibrary";
import recipes from "../apps/backend/data/recipe-library.json";
import index from "../apps/backend/data/recipe-library-index.json";

function python(script: string) {
  return JSON.parse(execFileSync("python3", ["-c", script], { encoding: "utf8" }));
}
it("keeps unquantified source ingredients unknown, parses fractions and never turns ranges into invented averages", () => {
  const result = python(`
import importlib.util,json
s=importlib.util.spec_from_file_location('r','apps/backend/scripts/import-rurecipes.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
print(json.dumps([m.ingredient(x,i) for i,x in enumerate(['Мука - 1/2 стакана','Масло - 1 ст. ложка','Сахар - 50-100 г','Творог - 200 г','Соль - по вкусу'])]))
`);
  expect(result[0]).toMatchObject({ quantity: 0.5, unit: "cup" });
  expect(result[1]).toMatchObject({ quantity: 1, unit: "tbsp" });
  expect(result[2]).toMatchObject({ quantity: null, rawAmount: "50-100 г" });
  expect(result[3]).toMatchObject({ quantity: 200, unit: "g" });
  expect(result[4]).toMatchObject({ quantity: null, unit: "toTaste" });
});
it("rejects wrong barcodes and missing macro data, converts explicit kJ, and does not convert ml into grams", () => {
  const result = python(`
import importlib.util,json
s=importlib.util.spec_from_file_location('o','apps/backend/scripts/import-off-bulk.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
r={'code':'4607044602831','product_name':[{'lang':'ru','text':'Тестовый продукт'}],'brands':'Марка','countries_tags':['en:russia'],'nutrition_data_per':'100g','product_quantity_unit':'g','nutriments':[{'name':'energy-kj','100g':418.4},{'name':'proteins','100g':5},{'name':'fat','100g':4},{'name':'carbohydrates','100g':11}]}
# Use an existing real source barcode and separately corrupt its check digit.
r['code']=json.load(open('apps/backend/data/products.openfoodfacts.json'))[0]['barcode']
p,e=m.convert_row(r)
missing={**r,'nutriments':r['nutriments'][:-1]};volume={**r,'product_quantity_unit':'ml'}
print(json.dumps({'kcal':p['per100']['kcal'] if p else None,'error':e,'missing':m.convert_row(missing)[1],'volume':m.convert_row(volume)[1],'badChecksum':m.valid_barcode(r['code'][:-1]+str((int(r['code'][-1])+1)%10))}))
`);
  expect(result).toEqual({ kcal: 100, error: null, missing: "missing_or_invalid_nutrition", volume: "volume_or_unknown_basis", badChecksum: false });
});
it("builds the same 3000-card index without steps and preserves all existing source IDs", () => {
  expect(recipes).toHaveLength(3000);
  expect(recipes.filter((r) => r.id.startsWith("ut-"))).toHaveLength(501);
  expect(recipes.filter((r) => r.id.startsWith("rf-"))).toHaveLength(2499);
  expect(index.map((r) => r.id)).toEqual(recipes.map((r) => r.id));
  expect(index.every((r) => !Object.hasOwn(r, "steps"))).toBe(true);
  const manifest = JSON.parse(readFileSync("apps/backend/data/rurecipes-import-report.json", "utf8"));
  expect(manifest.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
});
it("does not present an unknown cooking time as satisfying a strict time filter or unknown amounts as zero", () => {
  const recipe = recipes.find((r) => r.id.startsWith("rf-")) as LibraryRecipe;
  expect(searchLibrary([recipe], parseLibrarySearch({ maxMinutes: 30 })).total).toBe(0);
  expect(searchLibrary([recipe], parseLibrarySearch({ maxMinutes: 0 })).total).toBe(1);
  expect(libraryQuantity({ id: "unknown", name: "Сахар", quantity: null, unit: "unknown" }, 2, null)).toBe("не указано");
});
