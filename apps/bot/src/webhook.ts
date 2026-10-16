import type { Env } from "./env";
import { json, limitedJson } from "./http";
import { sendMessage } from "./telegram";
export async function handleUpdate(request: Request, env: Env) {
  if (
    request.headers.get("X-Telegram-Bot-Api-Secret-Token") !==
      env.WEBHOOK_SECRET ||
    !env.WEBHOOK_SECRET
  )
    return json({ error: "Unauthorized" }, 401);
  const update = (await limitedJson(request)) as {
    update_id: number;
    message?: {
      text?: string;
      chat: { id: number; type: string };
      from?: { id: number };
    };
  };
  if (!Number.isSafeInteger(update.update_id))
    return json({ error: "Bad update" }, 400);
  // Atomic dedup prevents normal Telegram retries from sending duplicate responses.
  const claim = await env.DB.prepare(
    "INSERT OR IGNORE INTO updates(id,processed_at) VALUES(?,?)",
  )
    .bind(update.update_id, Date.now())
    .run();
  if (!claim.meta.changes) return json({ ok: true });
  try {
    const message = update.message;
    if (message?.chat.type === "private" && message.from) {
      const command = message.text?.split(/[ @]/)[0];
      if (command === "/start") {
        await env.DB.prepare(
          "INSERT INTO users(id,chat_id,enabled) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET chat_id=excluded.chat_id,enabled=1",
        )
          .bind(message.from.id, message.chat.id)
          .run();
        await sendMessage(
          env.BOT_TOKEN,
          message.chat.id,
          "Привет! Это Полка 🍐\nЗаписывай еду и готовь из своих продуктов. Дневник хранится на твоём устройстве. Сроки для напоминаний можно передать отдельно.",
          env.WEB_APP_URL,
        );
      } else if (command === "/stop") {
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET enabled=0 WHERE id=?").bind(
            message.from.id,
          ),
          env.DB.prepare("DELETE FROM reminders WHERE user_id=?").bind(
            message.from.id,
          ),
        ]);
        await sendMessage(
          env.BOT_TOKEN,
          message.chat.id,
          "Напоминания отключены. Вернуться можно через /start.",
        );
      } else if (command === "/help") {
        await sendMessage(
          env.BOT_TOKEN,
          message.chat.id,
          "/start — открыть Полку\n/stop — отключить напоминания\nДанные дневника остаются на устройстве. В приложении есть экспорт резервной копии.",
          env.WEB_APP_URL,
        );
      }
    }
    return json({ ok: true });
  } catch (error) {
    await env.DB.prepare("DELETE FROM updates WHERE id=?")
      .bind(update.update_id)
      .run();
    throw error;
  }
}
