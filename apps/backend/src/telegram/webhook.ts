import { createHmac } from "node:crypto";
import { databasePool } from "../db/pool";
import { telegramCall, welcomeUser } from "../../../../shared/telegramWelcome";

export const webhookPath = "/api/telegram/webhook";
export function webhookSecret(token: string) {
  return createHmac("sha256", token)
    .update("polka:telegram-webhook:v1")
    .digest("hex");
}

export async function telegramWebhook(
  request: Request,
  env: {
    BOT_TOKEN?: string;
    DATABASE_URL?: string;
    APP_ORIGIN?: string;
  },
) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const { BOT_TOKEN, DATABASE_URL, APP_ORIGIN } = env;
  if (!BOT_TOKEN || !DATABASE_URL || !APP_ORIGIN)
    return new Response(null, { status: 503 });
  if (
    request.headers.get("X-Telegram-Bot-Api-Secret-Token") !==
    webhookSecret(BOT_TOKEN)
  )
    return new Response(null, { status: 403 });
  const update = await request.json().catch(() => null);
  if (!Number.isSafeInteger(update?.update_id))
    return new Response(null, { status: 400 });
  const message = update.message;
  const command =
    typeof message?.text === "string" ? message.text.split(/[\s@]/u)[0] : "";
  if (
    message?.chat?.type !== "private" ||
    !Number.isSafeInteger(message.message_id) ||
    !Number.isSafeInteger(message.chat.id) ||
    !["/help", "/start"].includes(command)
  )
    return new Response(null, { status: 204 });
  const client = await databasePool(DATABASE_URL).connect();
  try {
    await client.query("BEGIN");
    const claim = await client.query(
      "INSERT INTO polka_bot_updates(update_id) VALUES ($1) ON CONFLICT DO NOTHING",
      [update.update_id],
    );
    if (claim.rowCount) {
      if (command === "/start")
        await welcomeUser(
          BOT_TOKEN,
          message.chat.id,
          message.message_id,
          APP_ORIGIN,
        );
      else
        await telegramCall(BOT_TOKEN, "sendMessage", {
          chat_id: message.chat.id,
          text: "Открой Полку, добавь продукты и выбери, что приготовить.",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Открыть Полку",
                  style: "success",
                  web_app: { url: APP_ORIGIN },
                },
              ],
            ],
          },
        });
    }
    await client.query("COMMIT");
    return new Response(null, { status: 204 });
  } catch {
    await client.query("ROLLBACK");
    return new Response(null, { status: 503 });
  } finally {
    client.release();
  }
}
