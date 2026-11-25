import { createServer } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { handleRequest } from "./router";
import { RECEIPT_BODY_LIMIT } from "../../../shared/receipt";
import { frontendResponse } from "./http/frontend";
import { closeDatabasePools } from "./db/pool";
import { STATE_BODY_LIMIT } from "../../../shared/account";
const port = Number(process.env.PORT ?? 8788);
// Loopback by default; the local auth bypass is never enabled on a public bind.
const host = process.env.HOST ?? "127.0.0.1";
// Use configured public origin, never an untrusted Host / X-Forwarded-Host header.
const origin = new URL(process.env.APP_ORIGIN ?? `http://localhost:${port}`)
  .origin;
const webDirectory = process.env.WEB_DIST;
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of incoming) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (
        size >
        (/\/ai\/(receipt|transcribe)$/.test((incoming.url ?? "").split("?")[0])
          ? RECEIPT_BODY_LIMIT
          : (incoming.url ?? "").split("?")[0] === "/api/state"
            ? STATE_BODY_LIMIT
            : 24_000)
      ) {
        outgoing.writeHead(413);
        outgoing.end();
        return;
      }
      chunks.push(buffer);
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers))
      if (typeof value === "string") headers.set(key, value);
    const method = incoming.method ?? "GET";
    const controller = new AbortController();
    outgoing.on("close", () => {
      if (!outgoing.writableEnded) controller.abort();
    });
    const request = new Request(new URL(incoming.url ?? "/", origin), {
      signal: controller.signal,
      method,
      headers,
      ...(method !== "GET" && method !== "HEAD"
        ? { body: Buffer.concat(chunks) }
        : {}),
    });
    const remote = incoming.socket.remoteAddress;
    const local =
      process.env.BACKEND_LOCAL_DEV === "1" &&
      ["127.0.0.1", "::1"].includes(host) &&
      ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote ?? "");
    const pathname = new URL(request.url).pathname;
    const api = pathname === "/api" || pathname.startsWith("/api/");
    const response =
      webDirectory && !api
        ? await frontendResponse(request, webDirectory)
        : await handleRequest(request, process.env, local);
    outgoing.statusCode = response.status;
    response.headers.forEach((value, key) => outgoing.setHeader(key, value));
    if (response.body && method !== "HEAD")
      await pipeline(
        Readable.fromWeb(
          response.body as import("node:stream/web").ReadableStream,
        ),
        outgoing,
      );
    else {
      await response.body?.cancel();
      outgoing.end();
    }
  } catch {
    if (outgoing.headersSent || outgoing.destroyed) {
      outgoing.destroy();
      return;
    }
    outgoing.writeHead(500, { "Content-Type": "application/json" });
    outgoing.end(JSON.stringify({ error: "Не удалось обработать запрос." }));
  }
});
server.listen(port, host, () =>
  console.log(`Polka backend: http://${host}:${port}/api/health`),
);

// Let in-flight requests finish during a platform restart; cap shutdown time.
function shutdown() {
  const deadline = setTimeout(() => process.exit(1), 75_000);
  deadline.unref();
  server.close(() => {
    void closeDatabasePools().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
