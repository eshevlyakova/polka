import { webhookPath, webhookSecret } from "./webhook";
import { telegramCall } from "../../../../shared/telegramWelcome";

// Run explicitly from the deployed container, after applying migrations.
async function connect() {
  const { BOT_TOKEN, APP_ORIGIN } = process.env;
  if (!BOT_TOKEN || !APP_ORIGIN) throw new Error();
  const url = new URL(webhookPath, APP_ORIGIN);
  if (url.protocol !== "https:") throw new Error();
  const photo = await fetch(new URL("/polka-welcome.jpg", url), {
    method: "HEAD",
    signal: AbortSignal.timeout(10000),
  });
  if (!photo.ok || !photo.headers.get("Content-Type")?.startsWith("image/jpeg"))
    throw new Error();
  await telegramCall(BOT_TOKEN, "setWebhook", {
    url: url.href,
    secret_token: webhookSecret(BOT_TOKEN),
    allowed_updates: ["message"],
  });
  console.log("Webhook подключён:", url.href);
}
connect().catch(() => {
  console.error(
    "Не удалось подключить webhook. Проверь BOT_TOKEN, APP_ORIGIN и доступность картинки по HTTPS.",
  );
  process.exitCode = 1;
});
