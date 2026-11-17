export type CatalogRecipe = {
  id: string;
  name: string;
  nameRu?: string;
  language: string;
  ingredientsText: string[];
  steps: string[];
  source: {
    url: string;
    rawUrl: string;
    license: string;
    retrievedAt: string;
    sha256: string;
  };
  originalMarkdown: string;
  translation?: { method: string; reviewed: boolean };
};
export type CatalogProduct = {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  quantityLabel: string;
  per100: { kcal: number; protein: number; fat: number; carbs: number };
  basis: string;
  categories: string[];
  source: {
    name: string;
    url: string;
    license: string;
    retrievedAt: string;
    lastModified?: number;
  };
  verification: string;
};
