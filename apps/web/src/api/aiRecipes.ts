import {
  validateAiRecipes,
  type AiRecipeRequest,
} from "../../../../shared/aiRecipes";
import type { Recipe } from "../domain/model";
import { telegram } from "../telegram";
import { parseLibrarySearch } from "../../../../shared/librarySearch";
import { apiEndpoint } from "./endpoint";
import { sessionAuthorization } from "./account";

async function requestAi(
  input: AiRecipeRequest,
  testCode: string,
  signal: AbortSignal,
  task?: "search",
) {
  const url = apiEndpoint("/api/ai/recipes");
  if (!url)
    throw new Error(
      "ИИ ещё не подключён к опубликованной версии. Нужен адрес нашего API; обычные рецепты доступны ниже.",
    );
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const authorization =
    sessionAuthorization() ??
    (telegram?.initData ? `tma ${telegram.initData}` : undefined);
  if (authorization) headers.Authorization = authorization;
  if (testCode.trim()) headers["X-Polka-Test-Code"] = testCode.trim();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...input, ...(task ? { task } : {}) }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      "Не удалось связаться с ИИ. Проверь соединение и попробуй ещё раз.",
    );
  }
  let data: { error?: string; recipes?: unknown[]; search?: unknown };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error("Сервер вернул непонятный ответ. Попробуй позже.");
  }
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "Не удалось подобрать рецепты.",
    );
  return data;
}

export async function fetchAiRecipeSearch(
  input: AiRecipeRequest,
  testCode: string,
  signal: AbortSignal,
) {
  const data = await requestAi(input, testCode, signal, "search");
  if (!data.search)
    throw new Error(
      "Не удалось получить условия поиска от ИИ. Попробуй ещё раз.",
    );
  return parseLibrarySearch(data.search);
}

export async function fetchAiRecipes(
  input: AiRecipeRequest,
  testCode: string,
  signal: AbortSignal,
): Promise<Recipe[]> {
  const data = await requestAi(input, testCode, signal);
  const validated = validateAiRecipes(data, input);
  return validated.map((recipe, index) => ({
    ...recipe,
    id:
      typeof (data.recipes?.[index] as { id?: unknown })?.id === "string"
        ? (data.recipes![index] as { id: string }).id
        : `ai-${crypto.randomUUID()}`,
  }));
}
