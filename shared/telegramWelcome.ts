export async function telegramCall(
  token: string,
  method: string,
  payload: object,
) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (
    !response.ok ||
    ((await response.json()) as { ok?: boolean } | null)?.ok !== true
  )
    throw new Error("Telegram request failed");
}

export async function welcomeUser(
  token: string,
  chatId: number,
  messageId: number,
  appUrl: string,
) {
  const url = new URL(appUrl);
  if (url.protocol !== "https:") throw new Error("Mini App requires HTTPS");
  await telegramCall(token, "sendPhoto", {
    chat_id: chatId,
    photo: new URL("polka-welcome.jpg", url).href,
    caption:
      "Что есть дома? Назови продукты голосом или добавь чек. Полка предложит, что приготовить, а после еды поможет записать порцию в дневник.",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Открыть Полку",
            style: "success",
            web_app: { url: url.href },
          },
        ],
      ],
    },
  });
  // A failed deletion should never cause a second welcome message.
  await telegramCall(token, "deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  }).catch(() => {});
}
