import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Pool } from "pg";
import { migrateDatabase } from "../apps/backend/src/db/migrate";
import { closeDatabasePools } from "../apps/backend/src/db/pool";
import { accountRequest, sessionHash } from "../apps/backend/src/accounts/http";
import { AccountRepository } from "../apps/backend/src/accounts/repository";
import { handleRequest } from "../apps/backend/src/router";
import { UserStateRepository } from "../apps/backend/src/state/repository";
import { cook, eat } from "../apps/web/src/domain/actions";
import { basicFoods } from "../shared/basicFoods";

const testUrl = process.env.TEST_DATABASE_URL;
// Never target an unmarked or production database, even if DATABASE_URL is set.
const allowed = testUrl && /test/.test(new URL(testUrl).pathname);
const schema = `accounts_test_${randomUUID().replace(/-/g, "")}`;
const botToken = "FAKE_TEST_BOT_TOKEN";
function signed(
  id: number,
  name = "Тест Анна",
  date = Math.floor(Date.now() / 1000),
) {
  const data = new URLSearchParams({
    auth_date: String(date),
    user: JSON.stringify({ id, first_name: name, username: `test_${id}` }),
  });
  const check = [...data.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  data.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return data.toString();
}
describe.skipIf(!allowed)("PostgreSQL account integration", () => {
  let admin: Pool, pool: Pool, connection: string;
  beforeAll(async () => {
    admin = new Pool({ connectionString: testUrl, max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const url = new URL(testUrl!);
    url.searchParams.set("options", `-c search_path=${schema}`);
    connection = url.toString();
    pool = new Pool({ connectionString: connection, max: 3 });
    await migrateDatabase(pool, resolve("apps/backend/migrations"));
  });
  afterAll(async () => {
    await closeDatabasePools();
    await pool?.end();
    // Only the random schema created by this test suite is removed.
    if (admin) {
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  });
  const env = () => ({
    DATABASE_URL: connection,
    BOT_TOKEN: botToken,
    ALLOWED_ORIGIN: "https://polka.test",
  });
  async function call(
    path: string,
    body?: unknown,
    cookie?: string,
    local = false,
    origin = "https://polka.test",
  ) {
    return accountRequest(
      new Request(`https://polka.test${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Origin: origin,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      env(),
      local,
    );
  }
  const tokenCookie = (response: Response) =>
    response.headers.get("Set-Cookie")!.split(";")[0];
  it("repeats migrations without losing records and detects edited migration history", async () => {
    expect(
      await migrateDatabase(pool, resolve("apps/backend/migrations")),
    ).toEqual([]);
    const row = await pool.query(
      "SELECT name, checksum FROM polka_schema_migrations LIMIT 1",
    );
    await pool.query(
      "UPDATE polka_schema_migrations SET checksum = 'changed' WHERE name = $1",
      [row.rows[0].name],
    );
    await expect(
      migrateDatabase(pool, resolve("apps/backend/migrations")),
    ).rejects.toThrow("Applied migration changed");
    await pool.query(
      "UPDATE polka_schema_migrations SET checksum = $1 WHERE name = $2",
      [row.rows[0].checksum, row.rows[0].name],
    );
  });
  it("signs in only a verified Telegram identity, stores token hashes and keeps the same account on repeat login", async () => {
    const response = await call("/api/auth/telegram", {
      initData: signed(101),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Set-Cookie")).toContain("Secure");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const first = await response.json();
    expect(first.user.telegramId).toBe("101");
    expect(first.user.onboardingCompletedAt).toBeNull();
    expect(first.token).toBeUndefined();
    const rawToken = tokenCookie(response).split("=")[1];
    const saved = await pool.query(
      "SELECT token_hash FROM polka_sessions WHERE user_id = $1",
      [first.user.id],
    );
    expect(saved.rows[0].token_hash).toBe(sessionHash(rawToken));
    expect(saved.rows[0].token_hash).not.toBe(rawToken);
    const me = await call("/api/me", undefined, tokenCookie(response));
    expect((await me.json()).user.id).toBe(first.user.id);
    const repeated = await call("/api/auth/telegram", {
      initData: signed(101, "Тест Анна новая"),
    });
    expect((await repeated.json()).user.id).toBe(first.user.id);
    expect(
      (
        await pool.query(
          "SELECT count(*) FROM polka_users WHERE telegram_id = 101",
        )
      ).rows[0].count,
    ).toBe("1");
  });
  it("isolates sessions and revokes only the session being logged out", async () => {
    const a = await call("/api/auth/telegram", { initData: signed(202) });
    const b = await call("/api/auth/telegram", { initData: signed(303) });
    const ca = tokenCookie(a),
      cb = tokenCookie(b);
    expect(
      (await (await call("/api/me", undefined, cb)).json()).user.telegramId,
    ).toBe("303");
    expect((await call("/api/auth/logout", {}, ca)).status).toBe(200);
    expect((await call("/api/me", undefined, ca)).status).toBe(401);
    expect((await call("/api/me", undefined, cb)).status).toBe(200);
    expect(
      (await call("/api/me", undefined, "polka_session=made-up")).status,
    ).toBe(401);
    const token = cb.split("=")[1];
    await pool.query(
      "UPDATE polka_sessions SET created_at = now() - interval '2 days', expires_at = now() - interval '1 day' WHERE token_hash = $1",
      [sessionHash(token)],
    );
    expect((await call("/api/me", undefined, cb)).status).toBe(401);
  });
  it("rejects tampering, old signatures and foreign origins even in local mode", async () => {
    expect(
      (
        await call(
          "/api/auth/telegram",
          { initData: signed(404).replace("404", "505") },
          undefined,
          true,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await call(
          "/api/auth/telegram",
          {
            initData: signed(404, "Тест", Math.floor(Date.now() / 1000) - 4000),
          },
          undefined,
          true,
        )
      ).status,
    ).toBe(401);
    expect(
      (await call("/api/auth/telegram", { telegramId: 404 }, undefined, true))
        .status,
    ).toBe(401);
    expect(
      (
        await call(
          "/api/auth/telegram",
          { initData: signed(404) },
          undefined,
          false,
          "https://foreign.test",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await pool.query(
          "SELECT count(*) FROM polka_users WHERE telegram_id = 404",
        )
      ).rows[0].count,
    ).toBe("0");
  });
  it("rolls back a newly inserted account when the session insert fails", async () => {
    const repository = new AccountRepository(pool);
    const hash = sessionHash("duplicate-test-session");
    await repository.signIn(
      { telegramId: "606", displayName: "Тест", username: null },
      hash,
      new Date(),
      new Date(Date.now() + 60000),
    );
    await expect(
      repository.signIn(
        { telegramId: "707", displayName: "Тест", username: null },
        hash,
        new Date(),
        new Date(Date.now() + 60000),
      ),
    ).rejects.toThrow();
    expect(
      (
        await pool.query(
          "SELECT count(*) FROM polka_users WHERE telegram_id = 707",
        )
      ).rows[0].count,
    ).toBe("0");
  });

  async function stateCall(
    cookie?: string,
    write?: unknown,
    origin = "https://polka.test",
  ) {
    return handleRequest(
      new Request("https://polka.test/api/state", {
        method: write === undefined ? "GET" : "PUT",
        headers: {
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(write === undefined
            ? {}
            : { "Content-Type": "application/json" }),
        },
        ...(write === undefined ? {} : { body: JSON.stringify(write) }),
      }),
      env(),
      true,
    );
  }
  async function stateUser(id: number) {
    const login = await call("/api/auth/telegram", { initData: signed(id) });
    return { user: (await login.json()).user, cookie: tokenCookie(login) };
  }

  it("stores pantry, cooked batches, diary and profile atomically and replays a lost response once", async () => {
    const { user, cookie } = await stateUser(801);
    const initial = await (await stateCall(cookie)).json();
    expect(initial.revision).toBe(0);
    expect(initial.state.pantry).toEqual([]);
    expect(initial.state.diary).toEqual([]);
    expect(initial.state.profile.name).toBe("Тест Анна");
    const stocked = {
      ...initial.state,
      pantry: [{ id: "eggs", foodId: "egg", grams: 300, expiresOn: "" }],
    };
    const ingredients = [{ foodId: "egg", grams: 100 }];
    const cooked = cook(
      stocked,
      {
        id: "omelet",
        name: "Омлет",
        emoji: "",
        minutes: 10,
        servings: 2,
        ingredients,
        steps: [],
        equipment: "",
      },
      ingredients,
      basicFoods,
      "cooked",
      new Date().toISOString(),
    );
    const eaten = eat(cooked, "cooked", 0.25, "Обед", "lunch");
    eaten.profile = { name: "Анна", age: 22, heightCm: 170 };
    eaten.settings.onboarded = true;
    const write = {
      accountId: user.id,
      state: eaten,
      revision: 0,
      mutationId: randomUUID(),
    };
    expect((await stateCall(cookie, write)).status).toBe(200);
    const replay = await stateCall(cookie, write);
    expect(replay.status).toBe(200);
    const saved = await replay.json();
    expect(saved.revision).toBe(1);
    expect(saved.state.pantry[0].grams).toBe(200);
    expect(saved.state.batches[0].remainingFraction).toBe(0.75);
    expect(saved.state.diary).toHaveLength(1);
    expect(saved.state.profile).toEqual(eaten.profile);
    expect(saved.state.diary[0].nutrients.kcal).toBe(
      eaten.diary[0].nutrients.kcal,
    );
    const next = eat(saved.state, "cooked", 0.25, "Ужин", "dinner");
    expect(
      (
        await stateCall(cookie, {
          accountId: user.id,
          state: next,
          revision: 1,
          mutationId: randomUUID(),
        })
      ).status,
    ).toBe(200);
    // A replay after a later write returns the latest state; it never resurrects old amounts.
    const latest = await (await stateCall(cookie, write)).json();
    expect(latest.revision).toBe(2);
    expect(latest.state.pantry[0].grams).toBe(200);
    expect(latest.state.batches[0].remainingFraction).toBe(0.5);
    expect(latest.state.diary).toHaveLength(2);
    const repeatedLogin = await call("/api/auth/telegram", {
      initData: signed(801),
    });
    expect(
      (await (await stateCall(tokenCookie(repeatedLogin))).json()).state,
    ).toEqual(latest.state);
    expect(
      (await (await call("/api/me", undefined, cookie)).json()).user
        .onboardingCompletedAt,
    ).not.toBeNull();
  });

  it("serializes competing devices and rejects an idempotency key reused for another payload", async () => {
    const { user, cookie } = await stateUser(802);
    const { state } = await (await stateCall(cookie)).json();
    const a = {
      accountId: user.id,
      state: { ...state, profile: { name: "Первое устройство" } },
      revision: 0,
      mutationId: randomUUID(),
    };
    const b = {
      accountId: user.id,
      state: { ...state, profile: { name: "Второе устройство" } },
      revision: 0,
      mutationId: randomUUID(),
    };
    const responses = await Promise.all([
      stateCall(cookie, a),
      stateCall(cookie, b),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const conflict = await responses.find((r) => r.status === 409)!.json();
    expect(conflict.revision).toBe(1);
    expect(conflict.code).toBe("state_conflict");
    const winner = responses[0].status === 200 ? a : b;
    expect(
      (
        await stateCall(cookie, {
          ...winner,
          state: { ...state, profile: { name: "Подмена" } },
        })
      ).status,
    ).toBe(409);
    expect((await (await stateCall(cookie)).json()).revision).toBe(1);
    const rows = await pool.query(
      "SELECT count(*) FROM polka_state_writes WHERE user_id = $1",
      [user.id],
    );
    expect(rows.rows[0].count).toBe("1");
  });

  it("isolates accounts and refuses stale/wrong cookies, cross-origin writes and impossible input", async () => {
    const a = await stateUser(803),
      b = await stateUser(804);
    const initial = await (await stateCall(a.cookie)).json();
    const write = {
      accountId: a.user.id,
      state: initial.state,
      revision: 0,
      mutationId: randomUUID(),
    };
    expect((await stateCall(b.cookie, write)).status).toBe(403);
    expect((await stateCall(undefined, write)).status).toBe(401);
    expect(
      (await stateCall(a.cookie, write, "https://foreign.test")).status,
    ).toBe(403);
    expect(
      (
        await stateCall(a.cookie, {
          ...write,
          state: {
            ...initial.state,
            pantry: [{ id: "bad", foodId: "egg", grams: -1, expiresOn: "" }],
          },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await stateCall(a.cookie, {
          ...write,
          state: {
            ...initial.state,
            pantry: [
              { id: "bad", foodId: "unknown", grams: 10, expiresOn: "" },
            ],
          },
        })
      ).status,
    ).toBe(400);
    expect((await (await stateCall(a.cookie)).json()).revision).toBe(0);
    expect((await (await stateCall(b.cookie)).json()).state.pantry).toEqual([]);
    await call("/api/auth/logout", {}, a.cookie);
    expect((await stateCall(a.cookie, write)).status).toBe(401);
  });

  it("rolls back state changes when the receipt insert fails", async () => {
    const { user, cookie } = await stateUser(805);
    const before = await (await stateCall(cookie)).json();
    const repository = new UserStateRepository(pool);
    await expect(
      repository.save(user, {
        revision: 0,
        mutationId: "not-a-uuid",
        state: { ...before.state, profile: { name: "Не должно сохраниться" } },
      }),
    ).rejects.toThrow();
    const after = await (await stateCall(cookie)).json();
    expect(after.revision).toBe(before.revision);
    expect(after.state).toEqual(before.state);
  });
  it("supports Telegram frames with blocked cookies and revokes their bearer session on logout", async () => {
    const login = await call("/api/auth/telegram", { initData: signed(806) });
    const { user, sessionToken } = await login.json();
    expect(sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const headers = {
      Origin: "https://polka.test",
      Authorization: `Bearer ${sessionToken}`,
    };
    const request = (path: string, body?: unknown) =>
      handleRequest(
        new Request(`https://polka.test${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            ...headers,
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
        env(),
      );
    expect((await (await request("/api/me")).json()).user.id).toBe(user.id);
    expect((await (await request("/api/state")).json()).accountId).toBe(
      user.id,
    );
    expect((await request("/api/auth/logout", {})).status).toBe(200);
    expect((await request("/api/state")).status).toBe(401);
    expect((await call("/api/me", undefined, tokenCookie(login))).status).toBe(
      401,
    );
  });
});
