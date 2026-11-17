import { mkdirSync, copyFileSync } from "node:fs";
const directory = new URL("../apps/web/public/catalog/", import.meta.url);
mkdirSync(directory, { recursive: true });
copyFileSync(
  new URL("../apps/backend/data/recipe-library.json", import.meta.url),
  new URL("recipe-library.json", directory),
);
