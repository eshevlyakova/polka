import data from "../../data/recipe-library.json";
import type {
  LibraryRecipe,
  LibrarySearch,
} from "../../../../shared/recipeLibrary";
import { searchLibrary as search } from "../../../../shared/librarySearch";
export { parseLibrarySearch } from "../../../../shared/librarySearch";
export const recipeLibrary: LibraryRecipe[] = data;
export const searchLibrary = (input: LibrarySearch) =>
  search(recipeLibrary, input);
