import type { Env } from "./env";
import { json, limitedJson } from "./http";
import { sendMessage } from "./telegram";
export async function dispatchReminders(env: Env) {
  await env.DB.prepare(
    "UPDATE reminders SET status='pending',claimed_at=NULL WHERE status='sending' AND claimed_at<?",
  )
    .bind(Date.now() - 600000)
    .run();
  const rows = await env.DB.prepare(
    "SELECT r.id,r.text,u.chat_id FROM reminders r JOIN users u ON u.id=r.user_id WHERE r.status='pending' AND r.due_at<=? AND u.enabled=1 LIMIT 40",
  )
    .bind(Date.now())
    .all<{ id: string; text: string; chat_id: number }>();
  for (const row of rows.results) {
    const claim = await env.DB.prepare(
      "UPDATE reminders SET status='sending',claimed_at=? WHERE id=? AND status='pending'",
    )
      .bind(Date.now(), row.id)
      .run();
    if (!claim.meta.changes) continue;
    try {
      await sendMessage(env.BOT_TOKEN, row.chat_id, row.text, env.WEB_APP_URL);
      await env.DB.prepare("DELETE FROM reminders WHERE id=?")
        .bind(row.id)
        .run();
    } catch {
      await env.DB.prepare(
        "UPDATE reminders SET status='pending',due_at=?,claimed_at=NULL WHERE id=?",
      )
        .bind(Date.now() + 3600000, row.id)
        .run();
    }
  }
  await env.DB.prepare("DELETE FROM updates WHERE processed_at<?")
    .bind(Date.now() - 7 * 86400000)
    .run();
}
