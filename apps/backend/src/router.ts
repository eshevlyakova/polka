import { telegramWebhook, webhookPath } from "./telegram/webhook";
import { authorizedAiTask, handleAiRequest, type AiEnv } from "./ai/handler";
import { recognizeReceipt } from "./ai/receipt";
import { interpretProducts, transcribeProducts } from "./ai/voice";
import { speakQuestion } from "./ai/speech";
import { VOICE_BODY_LIMIT } from "../../../shared/voice";
import { receiptImage, RECEIPT_BODY_LIMIT } from "../../../shared/receipt";
import { nutritionCandidates } from "../../../shared/nutritionMatching";
import { basicFoods } from "../../../shared/basicFoods";
import { accountRequest } from "./accounts/http";
import { userStateRequest } from "./state/http";
import {
  recipeLibrary,
  parseLibrarySearch,
  searchLibrary,
} from "./catalog/library";
import {
  catalogProducts,
  catalogRecipes,
  searchProducts,
  searchRecipes,
} from "./catalog/repository";

export async function handleRequest(
  request: Request,
  env: AiEnv,
  local = false,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === webhookPath) return telegramWebhook(request, env);
  if (url.pathname === "/api/ai/transcribe")
    return authorizedAiTask(
      request,
      env,
      local,
      (value, connection, signal) =>
        transcribeProducts(
          value,
          connection,
          env.AI_SPEECH_MODEL?.trim() || "openai/gpt-4o-mini-transcribe",
          signal,
        ),
      VOICE_BODY_LIMIT,
    );
  if (url.pathname === "/api/ai/speak")
    return authorizedAiTask(request, env, local, (value, connection, signal) =>
      speakQuestion(value, connection, signal),
    );
  if (url.pathname === "/api/ai/products")
    return authorizedAiTask(request, env, local, (value, connection, signal) =>
      interpretProducts(value, connection, signal),
    );
  if (url.pathname === "/api/state") return userStateRequest(request, env);
  if (url.pathname === "/api/me" || url.pathname.startsWith("/api/auth/"))
    return accountRequest(request, env, local);
  if (url.pathname === "/api/ai/receipt")
    return authorizedAiTask(
      request,
      env,
      local,
      async (value, key, signal) =>
        recognizeReceipt(receiptImage(value), key, fetch, signal),
      RECEIPT_BODY_LIMIT,
    );
  if (url.pathname === "/api/ai/recipes")
    return handleAiRequest(request, env, local);
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGIN?.split(",").map((s) => s.trim()) ?? [];
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowed.includes(origin))
    headers["Access-Control-Allow-Origin"] = origin;
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers });
  if (origin && !allowed.includes(origin))
    return json({ error: "Этот адрес приложения не разрешён сервером." }, 403);
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  if (url.pathname === "/api/library/search" && request.method === "POST") {
    try {
      const raw = await request.text();
      if (raw.length > 30000)
        return json({ error: "Слишком большой запрос." }, 413);
      return json(searchLibrary(parseLibrarySearch(JSON.parse(raw))));
    } catch {
      return json(
        { error: "Не удалось выполнить поиск. Проверь запрос и фильтры." },
        400,
      );
    }
  }
  if (request.method !== "GET")
    return json({ error: "Каталог доступен только для чтения." }, 405);
  if (url.pathname === "/api/health")
    return json({
      ok: true,
      recipes: catalogRecipes.length,
      products: catalogProducts.length,
      libraryRecipes: recipeLibrary.length,
    });
  const q = url.searchParams.get("q") ?? "";
  if (url.pathname === "/api/catalog/nutrition-match") {
    if (!q.trim() || q.length > 160)
      return json({ error: "Укажи название продукта." }, 400);
    return json({
      candidates: nutritionCandidates(q, catalogProducts, basicFoods),
      products: catalogProducts.length,
      genericFoods: basicFoods.length,
    });
  }
  if (url.pathname.startsWith("/api/library/recipes/")) {
    const id = url.pathname.slice("/api/library/recipes/".length);
    const recipe = recipeLibrary.find((r) => r.id === id);
    return recipe ? json(recipe) : json({ error: "Рецепт не найден." }, 404);
  }
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  if (
    q.length > 120 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 100_000
  )
    return json(
      { error: "Проверь параметры поиска: limit 1–100, offset от 0." },
      400,
    );
  if (url.pathname === "/api/catalog/products") {
    const barcode = url.searchParams.get("barcode");
    if (barcode && !/^\d{8,14}$/.test(barcode))
      return json({ error: "Некорректный штрихкод." }, 400);
    const found = barcode
      ? searchProducts(barcode, 1)
      : q
        ? searchProducts(q, catalogProducts.length)
        : catalogProducts;
    return json({
      items: found.slice(offset, offset + limit),
      total: found.length,
      offset,
      limit,
      attribution: [
        ...new Set(
          found.map((p) =>
            p.source.name === "Open Food Facts"
              ? "Open Food Facts — ODbL-1.0"
              : p.source.name,
          ),
        ),
      ].join("; "),
      licenseUrl: found.every((p) => p.source.name === "Open Food Facts")
        ? "https://opendatacommons.org/licenses/odbl/1-0/"
        : null,
      verified: false,
    });
  }
  if (url.pathname === "/api/catalog/recipes") {
    const found = q ? searchRecipes(q, catalogRecipes.length) : catalogRecipes;
    return json({
      items: found
        .slice(offset, offset + limit)
        .map(({ originalMarkdown: _raw, ...r }) => r),
      total: found.length,
      offset,
      limit,
    });
  }
  const match = url.pathname.match(/^\/api\/catalog\/recipes\/([a-z0-9-]+)$/);
  if (match) {
    const recipe = catalogRecipes.find((r) => r.id === match[1]);
    if (!recipe) return json({ error: "Рецепт не найден." }, 404);
    const { originalMarkdown: _raw, ...item } = recipe;
    return json(item);
  }
  return json({ error: "Маршрут не найден." }, 404);
}
