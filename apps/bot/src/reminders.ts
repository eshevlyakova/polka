import type { Env } from "./env";
import { json, limitedJson } from "./http";
import { sendMessage } from "./telegram";
import { validateInitData } from "./auth";
export async function handleReminders(request: Request, env: Env) {
  const authorization = request.headers.get("Authorization") ?? "";
  let userId: number;
  try {
    userId = await validateInitData(
      authorization.startsWith("tma ") ? authorization.slice(4) : "",
      env.BOT_TOKEN,
    );
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }
  const body = (await limitedJson(request)) as {
    enabled: boolean;
    items: { name: string; expiresOn: string }[];
  };
  if (
    typeof body.enabled !== "boolean" ||
    !Array.isArray(body.items) ||
    body.items.length > 50
  )
    return json({ error: "Invalid input" }, 400);
  if (
    !body.items.every(
      (i) =>
        typeof i.name === "string" &&
        i.name.length > 0 &&
        i.name.length <= 100 &&
        typeof i.expiresOn === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(i.expiresOn),
    )
  )
    return json({ error: "Invalid input" }, 400);
  const user = await env.DB.prepare("SELECT chat_id FROM users WHERE id=?")
    .bind(userId)
    .first();
  if (!user) return json({ error: "Start bot first" }, 409);
  const statements = [
    env.DB.prepare("DELETE FROM reminders WHERE user_id=?").bind(userId),
    env.DB.prepare("UPDATE users SET enabled=? WHERE id=?").bind(
      body.enabled ? 1 : 0,
      userId,
    ),
  ];
  if (body.enabled) {
    for (const item of body.items) {
      const expiry = Date.parse(item.expiresOn + "T09:00:00+03:00");
      if (!Number.isFinite(expiry)) return json({ error: "Invalid date" }, 400);
      const due = Math.max(Date.now() + 60_000, expiry - 86400000);
      if (due > Date.now() + 3 * 86400000 || expiry < Date.now() - 86400000)
        return json({ error: "Only near-term dates supported" }, 400);
      statements.push(
        env.DB.prepare(
          "INSERT INTO reminders(id,user_id,due_at,text) VALUES(?,?,?,?)",
        ).bind(
          crypto.randomUUID(),
          userId,
          due,
          `🍐 На полке: ${item.name}. Указанный срок — ${item.expiresOn}. Проверь продукт и реши, что приготовить.`,
        ),
      );
    }
  }
  await env.DB.batch(statements);
  return json({ ok: true, count: body.enabled ? body.items.length : 0 });
}
