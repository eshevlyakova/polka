import type {
  Account,
  StateSnapshot,
  StateWrite,
} from "../../../../shared/account";
import { uuidPattern } from "../../../../shared/account";
import { parseAccountState } from "../../../../shared/accountState";
let sessionToken: string | undefined;
export const sessionAuthorization = () =>
  sessionToken ? `Bearer ${sessionToken}` : undefined;

export class AccountApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public snapshot?: StateSnapshot,
  ) {
    super(message);
  }
}
export function parseSnapshot(value: unknown): StateSnapshot {
  const data = value as StateSnapshot;
  if (!data || !Number.isInteger(data.revision) || data.revision < 0)
    throw new Error("Не удалось прочитать версию данных.");
  return { revision: data.revision, state: parseAccountState(data.state) };
}
async function request(path: string, method = "GET", body?: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new AccountApiError(
        "Сервер вернул непонятный ответ. Попробуй ещё раз.",
        502,
      );
    }
    if (!response.ok)
      throw new AccountApiError(
        typeof data?.error === "string"
          ? data.error
          : "Не удалось связаться с аккаунтом.",
        response.status,
        response.status === 409 ? parseSnapshot(data) : undefined,
      );
    return data;
  } catch (error) {
    if (error instanceof AccountApiError) throw error;
    throw new AccountApiError(
      "Не удалось связаться с Полкой. Проверь интернет и попробуй ещё раз.",
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
export async function signIn(initData?: string): Promise<Account> {
  const data = initData
    ? await request("/api/auth/telegram", "POST", { initData })
    : await request("/api/me");
  const user = data?.user as Account;
  if (
    !user ||
    !uuidPattern.test(user.id) ||
    !/^\d+$/.test(user.telegramId) ||
    typeof user.displayName !== "string"
  )
    throw new Error("Не удалось подтвердить аккаунт.");
  if (initData) {
    if (
      typeof data.sessionToken !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(data.sessionToken)
    )
      throw new Error("Не удалось открыть сессию.");
    sessionToken = data.sessionToken;
  }
  return user;
}
export async function signOut() {
  await request("/api/auth/logout", "POST", {});
  sessionToken = undefined;
}
export async function loadAccountState(accountId: string) {
  const data = await request("/api/state");
  if (data.accountId !== accountId)
    throw new Error(
      "Аккаунт изменился. Открой приложение заново через Telegram.",
    );
  return parseSnapshot(data);
}
export async function saveAccountState(write: StateWrite, accountId: string) {
  const data = await request("/api/state", "PUT", { ...write, accountId });
  if (data.accountId !== accountId)
    throw new AccountApiError(
      "Аккаунт изменился. Открой приложение заново.",
      403,
    );
  return parseSnapshot(data);
}
