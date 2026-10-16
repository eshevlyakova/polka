// Run locally with environment variables. Never paste the token into source code.
const { BOT_TOKEN, WEBHOOK_SECRET, WORKER_URL, WEB_APP_URL } = process.env;
if (!BOT_TOKEN || !WEBHOOK_SECRET || !WORKER_URL || !WEB_APP_URL)
  throw new Error("Set BOT_TOKEN, WEBHOOK_SECRET, WORKER_URL, WEB_APP_URL");
if (!WEB_APP_URL.startsWith("https://") || !WORKER_URL.startsWith("https://"))
  throw new Error("HTTPS URLs required");
for (const [method, body] of [
  [
    "setWebhook",
    {
      url: `${WORKER_URL.replace(/\/$/, "")}/telegram/webhook`,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ["message"],
    },
  ],
  [
    "setChatMenuButton",
    {
      menu_button: {
        type: "web_app",
        text: "Открыть Полку",
        web_app: { url: WEB_APP_URL },
      },
    },
  ],
  [
    "setMyCommands",
    {
      commands: [
        { command: "start", description: "Открыть Полку" },
        { command: "help", description: "Как пользоваться" },
        { command: "stop", description: "Отключить напоминания" },
      ],
    },
  ],
]) {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const result = await response.json();
  if (!result.ok) throw new Error(`${method} failed: ${result.description}`);
  console.log(`${method}: OK`);
}
