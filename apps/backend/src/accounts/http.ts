import { createHash, randomBytes } from "node:crypto";
import { validateInitData } from "../../../../shared/telegramAuth";
import type { AiEnv } from "../ai/handler";
import { databasePool } from "../db/pool";
import { AccountRepository } from "./repository";

const SESSION_SECONDS = 7 * 86400;
const COOKIE = "polka_session";
export const sessionHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function tokenFrom(request: Request) {
  const authorization = request.headers.get("Authorization") ?? "";
  if (authorization.startsWith("Bearer ")) {
    const token = authorization.slice(7);
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }
  const values = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith(`${COOKIE}=`));
  if (values.length !== 1) return null;
  const token = values[0].slice(COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export async function sessionAccount(request: Request, env: AiEnv) {
  const token = tokenFrom(request);
  return token && env.DATABASE_URL
    ? new AccountRepository(databasePool(env.DATABASE_URL)).findSession(
        sessionHash(token),
        new Date(),
      )
    : null;
}
function cookie(token: string, local: boolean) {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=${token ? SESSION_SECONDS : 0}${local ? "" : "; Secure"}`;
}

/** Account endpoints never accept a Telegram ID supplied without a valid signature. */
export async function accountRequest(
  request: Request,
  env: AiEnv,
  local = false,
): Promise<Response> {
  const url = new URL(request.url);
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers });
  const origin = request.headers.get("Origin");
  const allowed = new Set([
    url.origin,
    ...(env.ALLOWED_ORIGIN?.split(",").map((s) => s.trim()) ?? []),
  ]);
  if (origin && !allowed.has(origin))
    return json({ error: "Этот адрес приложения не разрешён сервером." }, 403);
  const expected = url.pathname === "/api/me" ? "GET" : "POST";
  if (request.method !== expected)
    return json({ error: `Нужен ${expected}-запрос.` }, 405);
  if (
    !["/api/me", "/api/auth/telegram", "/api/auth/logout"].includes(
      url.pathname,
    )
  )
    return json({ error: "Страница не найдена." }, 404);
  if (
    request.method === "POST" &&
    request.headers.get("Content-Type")?.split(";")[0].trim() !==
      "application/json"
  )
    return json({ error: "Нужен JSON-запрос." }, 415);
  if (url.pathname === "/api/me" && !tokenFrom(request))
    return json({ error: "Открой Полку через Telegram." }, 401);
  if (!env.DATABASE_URL)
    return json({ error: "Аккаунт сейчас недоступен. Попробуй войти чуть позже." }, 503);
  try {
    const repository = new AccountRepository(databasePool(env.DATABASE_URL));
    if (url.pathname === "/api/auth/telegram") {
      if (!env.BOT_TOKEN)
        return json({ error: "Сейчас не получается войти через Telegram. Попробуй чуть позже." }, 503);
      const raw = await request.text();
      if (raw.length > 12000)
        return json({ error: "Слишком большой запрос." }, 413);
      let data: { initData?: unknown };
      try {
        data = JSON.parse(raw);
      } catch {
        return json({ error: "Некорректный запрос." }, 400);
      }
      if (!data || typeof data.initData !== "string")
        return json({ error: "Открой приложение через Telegram." }, 401);
      let telegramId: number;
      try {
        telegramId = await validateInitData(data.initData, env.BOT_TOKEN);
      } catch {
        return json(
          {
            error:
              "Не удалось подтвердить вход. Открой приложение заново через Telegram.",
          },
          401,
        );
      }
      // Read identity only AFTER signature/date validation. Do not store raw initData.
      const identity = JSON.parse(
        new URLSearchParams(data.initData).get("user")!,
      ) as { first_name?: unknown; last_name?: unknown; username?: unknown };
      const displayName =
        [identity.first_name, identity.last_name]
          .filter((s): s is string => typeof s === "string")
          .join(" ")
          .trim()
          .slice(0, 160) || "Пользователь";
      const username =
        typeof identity.username === "string"
          ? identity.username.slice(0, 64)
          : null;
      const token = randomBytes(32).toString("base64url");
      const now = new Date();
      const user = await repository.signIn(
        { telegramId: String(telegramId), displayName, username },
        sessionHash(token),
        now,
        new Date(now.getTime() + SESSION_SECONDS * 1000),
      );
      headers.set("Set-Cookie", cookie(token, local));
      // Mini Apps can run in third-party frames where cookies are blocked.
      // The client keeps this opaque token in memory only, never in localStorage.
      return json({ user, sessionToken: token });
    }
    const token = tokenFrom(request);
    if (url.pathname === "/api/auth/logout") {
      if (token) await repository.revokeSession(sessionHash(token));
      headers.set("Set-Cookie", cookie("", local));
      return json({ ok: true });
    }
    const user = token
      ? await repository.findSession(sessionHash(token), new Date())
      : null;
    if (!user) {
      headers.set("Set-Cookie", cookie("", local));
      return json(
        { error: "Открой приложение через Telegram, чтобы войти." },
        401,
      );
    }
    return json({ user });
  } catch {
    return json(
      {
        error: "Не удалось связаться с хранилищем аккаунтов. Попробуй ещё раз.",
      },
      503,
    );
  }
}
