import type { AiEnv } from "../ai/handler";
import { sessionAccount } from "../accounts/http";
import { databasePool } from "../db/pool";
import { parseAccountState } from "../../../../shared/accountState";
import { STATE_BODY_LIMIT, uuidPattern } from "../../../../shared/account";
import { StateConflict, UserStateRepository } from "./repository";

export async function userStateRequest(
  request: Request,
  env: AiEnv,
): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  const origin = request.headers.get("Origin");
  const allowed = [
    new URL(request.url).origin,
    ...(env.ALLOWED_ORIGIN?.split(",").map((s) => s.trim()) ?? []),
  ];
  if (origin && !allowed.includes(origin))
    return json({ error: "Этот адрес приложения не разрешён сервером." }, 403);
  if (!["GET", "PUT"].includes(request.method))
    return json({ error: "Нужен GET или PUT-запрос." }, 405);
  if (
    request.method === "PUT" &&
    request.headers.get("Content-Type")?.split(";")[0].trim() !==
      "application/json"
  )
    return json({ error: "Нужен JSON-запрос." }, 415);
  if (!env.DATABASE_URL)
    return json({ error: "Хранилище аккаунтов ещё не настроено." }, 503);
  try {
    const user = await sessionAccount(request, env);
    if (!user)
      return json(
        {
          error:
            "Войди через Telegram заново. Неподтверждённые изменения сохранены на этом устройстве.",
          code: "session_expired",
        },
        401,
      );
    const repository = new UserStateRepository(databasePool(env.DATABASE_URL));
    if (request.method === "GET")
      return json({ ...(await repository.load(user)), accountId: user.id });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > STATE_BODY_LIMIT)
      return json({ error: "Сохранение слишком большое." }, 413);
    let value: Record<string, unknown>, state;
    try {
      value = JSON.parse(raw);
      if (value?.accountId !== user.id)
        return json(
          {
            error:
              "Аккаунт изменился. Открой приложение заново через Telegram; черновик сохранён отдельно.",
            code: "account_changed",
          },
          403,
        );
      if (
        !value ||
        !Number.isInteger(value.revision) ||
        (value.revision as number) < 0 ||
        (value.revision as number) > 2_000_000_000 ||
        typeof value.mutationId !== "string" ||
        !uuidPattern.test(value.mutationId)
      )
        throw new Error("Некорректный номер сохранения.");
      state = parseAccountState(value.state);
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Проверь данные сохранения.",
        },
        400,
      );
    }
    return json({
      ...(await repository.save(user, {
        state,
        revision: value.revision as number,
        mutationId: value.mutationId as string,
      })),
      accountId: user.id,
    });
  } catch (error) {
    if (error instanceof StateConflict)
      return json(
        { error: error.message, code: "state_conflict", ...error.snapshot },
        409,
      );
    return json(
      {
        error: "Не удалось сохранить или загрузить данные. Попробуй ещё раз.",
        code: "storage_unavailable",
      },
      503,
    );
  }
}
