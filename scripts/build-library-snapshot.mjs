import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
const directory = new URL("../apps/web/public/catalog/", import.meta.url);
mkdirSync(directory, { recursive: true });
copyFileSync(
  new URL("../apps/backend/data/recipe-library.json", import.meta.url),
  new URL("recipe-library.json", directory),
);
const recipes = JSON.parse(readFileSync(new URL("../apps/backend/data/recipe-library.json", import.meta.url), "utf8"));
const index = recipes.map(({ steps, ...recipe }) => recipe);
writeFileSync(new URL("../apps/backend/data/recipe-library-index.json", import.meta.url), JSON.stringify(index));
writeFileSync(new URL("recipe-library-index.json", directory), JSON.stringify(index));
const details = new URL("recipes/", directory);
mkdirSync(details, { recursive: true });
for (const recipe of recipes) writeFileSync(new URL(`${encodeURIComponent(recipe.id)}.json`, details), JSON.stringify(recipe));
