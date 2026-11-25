import { afterEach, expect, it, vi } from "vitest";
import { welcomeUser } from "../shared/telegramWelcome";
import { telegramWebhook } from "../apps/backend/src/telegram/webhook";
afterEach(() => vi.unstubAllGlobals());

it("sends the branded photo before deleting only the incoming command", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ ok: true }))
    .mockResolvedValueOnce(new Response(null, { status: 400 }));
  vi.stubGlobal("fetch", fetcher);
  await welcomeUser("dummy", 12, 34, "https://polka.test");
  expect(fetcher.mock.calls[0][0]).toMatch(/sendPhoto$/);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    photo: "https://polka.test/polka-welcome.jpg",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Открыть Полку",
            style: "success",
            web_app: { url: "https://polka.test/" },
          },
        ],
      ],
    },
  });
  expect(fetcher.mock.calls[1][0]).toMatch(/deleteMessage$/);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
    chat_id: 12,
    message_id: 34,
  });
});
it("keeps the command if sending the welcome failed", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 503 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    welcomeUser("dummy", 12, 34, "https://polka.test"),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rejects webhook calls without Telegram's configured secret", async () => {
  const response = await telegramWebhook(
    new Request("https://polka.test/api/telegram/webhook", { method: "POST" }),
    {
      BOT_TOKEN: "dummy",
      APP_ORIGIN: "https://polka.test",
      DATABASE_URL: "unused",
    },
  );
  expect(response.status).toBe(403);
});
