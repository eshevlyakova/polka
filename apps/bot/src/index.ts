import type { Env } from "./env";
import { json } from "./http";
import { handleUpdate } from "./webhook";
import { handleReminders } from "./reminders";
import { dispatchReminders } from "./scheduler";
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    const origin = request.headers.get("Origin");
    const cors: Record<string, string> =
      origin === env.ALLOWED_ORIGIN
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : {};
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    try {
      let result: Response;
      if (path === "/health") result = json({ ok: true });
      else if (path === "/telegram/webhook" && request.method === "POST")
        result = await handleUpdate(request, env);
      else if (path === "/api/reminders" && request.method === "POST") {
        if (origin && origin !== env.ALLOWED_ORIGIN)
          return json({ error: "Forbidden origin" }, 403);
        result = await handleReminders(request, env);
      } else result = json({ error: "Not found" }, 404);
      const response = new Response(result.body, result);
      for (const [key, value] of Object.entries(cors))
        response.headers.set(key, value);
      return response;
    } catch {
      return json({ error: "Request failed" }, 500, cors);
    }
  },
  async scheduled(_controller: ScheduledController, env: Env) {
    await dispatchReminders(env);
  },
} satisfies ExportedHandler<Env>;
