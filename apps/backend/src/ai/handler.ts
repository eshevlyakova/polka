import { AiError, parseAiRequest } from "../../../../shared/aiRecipes";
import { validateInitData } from "../../../../shared/telegramAuth";
import { generateRecipes } from "./provider";
import { interpretRecipeSearch } from "./search";
import { sessionAccount } from "../accounts/http";

export interface AiEnv {
  DATABASE_URL?: string;
  API_GLM?: string;
  ALLOWED_ORIGIN?: string;
  BOT_TOKEN?: string;
  AI_TEST_CODE?: string;
}
const visits = new Map<string, { count: number; reset: number }>();
let active = false;
function sameSecret(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
export async function authorizedAiTask(
  request: Request,
  env: AiEnv,
  local: boolean,
  task: (value: unknown, key: string, signal: AbortSignal) => Promise<unknown>,
  maxBody = 24_000,
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const allowed =
    env.ALLOWED_ORIGIN?.split(",").map((value) => value.trim()) ?? [];
  const cors: Record<string, string> =
    origin && allowed.includes(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {};
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: cors });
  if (origin && !allowed.includes(origin))
    return json({ error: "Этот адрес приложения не разрешён сервером." }, 403);
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, X-Polka-Test-Code",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  if (request.method !== "POST")
    return json({ error: "Нужен POST-запрос." }, 405);
  try {
    if (!env.API_GLM) throw new AiError("На сервере не настроен API_GLM.", 503);
    let user = "local";
    if (!local) {
      if (!env.BOT_TOKEN && !env.AI_TEST_CODE && !env.DATABASE_URL)
        throw new AiError(
          "На сервере не настроен доступ к тестированию ИИ.",
          503,
        );
      const code = request.headers.get("X-Polka-Test-Code") ?? "";
      if (
        env.AI_TEST_CODE &&
        code.length <= 200 &&
        sameSecret(code, env.AI_TEST_CODE)
      )
        user = "test-group";
      else {
        let account: Awaited<ReturnType<typeof sessionAccount>>;
        try {
          account = await sessionAccount(request, env);
        } catch {
          throw new AiError(
            "Не удалось проверить аккаунт. Попробуй ещё раз.",
            503,
          );
        }
        try {
          if (account) user = `tg-${account.telegramId}`;
          else {
            const authorization = request.headers.get("Authorization") ?? "";
            if (!env.BOT_TOKEN || !authorization.startsWith("tma "))
              throw new Error();
            user = `tg-${await validateInitData(authorization.slice(4), env.BOT_TOKEN)}`;
          }
        } catch {
          throw new AiError(
            "Открой приложение через Telegram или введи код тестирования.",
            401,
          );
        }
      }
    }
    const raw = await request.text();
    if (raw.length > maxBody)
      throw new AiError(
        "Слишком большой запрос. Уменьши список продуктов.",
        413,
      );
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new AiError("Некорректный JSON.");
    }
    const now = Date.now();
    for (const [key, visit] of visits)
      if (visit.reset < now) visits.delete(key);
    const visit = visits.get(user) ?? { count: 0, reset: now + 600_000 };
    if (active)
      throw new AiError(
        "Уже выполняется запрос. Дождись его завершения или отмени его.",
        429,
        "request_in_progress",
      );
    if (visit.count >= (local ? 20 : user === "test-group" ? 30 : 10))
      throw new AiError(
        `Слишком много попыток. Попробуй через ${Math.max(1, Math.ceil((visit.reset - now) / 60000))} мин.`,
        429,
        "app_rate_limit",
      );
    visit.count++;
    visits.set(user, visit);
    active = true;
    try {
      return json(await task(value, env.API_GLM, request.signal));
    } finally {
      active = false;
    }
  } catch (error) {
    return error instanceof AiError
      ? json({ error: error.message, code: error.code }, error.status)
      : json({ error: "Не удалось обработать запрос. Попробуй ещё раз." }, 500);
  }
}

export function handleAiRequest(request: Request, env: AiEnv, local = false) {
  return authorizedAiTask(request, env, local, async (value, key, signal) => {
    const input = parseAiRequest(value);
    if ((value as { task?: unknown }).task === "search")
      return { search: await interpretRecipeSearch(input, key, fetch, signal) };
    return { recipes: await generateRecipes(input, key, fetch, signal) };
  });
}
