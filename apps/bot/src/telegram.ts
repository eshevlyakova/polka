export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  url?: string,
) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(url
          ? {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "Открыть Полку", web_app: { url } }],
                ],
              },
            }
          : {}),
      }),
    },
  );
  const result = (await response.json()) as { ok: boolean };
  if (!response.ok || !result.ok) throw new Error("Telegram send failed");
}
