import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { handleRequest } from "../backend/src/router";
import { RECEIPT_BODY_LIMIT } from "../../shared/receipt";
import { STATE_BODY_LIMIT } from "../../shared/account";
export function aiDevPlugin(): Plugin {
  return {
    name: "polka-local-ai",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(
        server.config.mode,
        fileURLToPath(new URL("../../", import.meta.url)),
        "",
      );
      server.middlewares.use("/api", async (incoming, outgoing) => {
        const host = incoming.headers.host ?? "127.0.0.1";
        const origin = `http://${host}`;
        const remote = incoming.socket.remoteAddress;
        if (
          !["127.0.0.1", "localhost", "[::1]"].includes(
            new URL(origin).hostname,
          )
        ) {
          outgoing.statusCode = 403;
          outgoing.end();
          return;
        }
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote ?? "")) {
          outgoing.statusCode = 403;
          outgoing.end();
          return;
        }
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of incoming) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buffer.length;
            if (
              size >
              ((incoming.url ?? "").split("?")[0].endsWith("/ai/receipt")
                ? RECEIPT_BODY_LIMIT
                : (incoming.url ?? "").split("?")[0] === "/state"
                  ? STATE_BODY_LIMIT
                  : 24_000)
            ) {
              outgoing.statusCode = 413;
              outgoing.end(JSON.stringify({ error: "Слишком большой запрос" }));
              return;
            }
            chunks.push(buffer);
          }
          const body = Buffer.concat(chunks).toString("utf8");
          const headers = new Headers();
          for (const [key, value] of Object.entries(incoming.headers))
            if (typeof value === "string") headers.set(key, value);
          const method = incoming.method ?? "GET";
          const controller = new AbortController();
          outgoing.on("close", () => {
            if (!outgoing.writableEnded) controller.abort();
          });
          const request = new Request(`${origin}/api${incoming.url ?? ""}`, {
            signal: controller.signal,
            method,
            headers,
            ...(method !== "GET" && method !== "HEAD" ? { body } : {}),
          });
          const response = await handleRequest(
            request,
            {
              API_GLM: env.API_GLM,
              ALLOWED_ORIGIN: origin,
              BOT_TOKEN: env.BOT_TOKEN,
              DATABASE_URL: env.DATABASE_URL,
            },
            true,
          );
          outgoing.statusCode = response.status;
          response.headers.forEach((value, key) =>
            outgoing.setHeader(key, value),
          );
          outgoing.end(await response.text());
        } catch {
          outgoing.statusCode = 500;
          outgoing.end(
            JSON.stringify({ error: "Не удалось обработать локальный запрос" }),
          );
        }
      });
    },
  };
}
