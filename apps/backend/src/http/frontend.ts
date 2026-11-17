import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** Serve only the explicit build directory; API misses never reach this handler. */
export async function frontendResponse(
  request: Request,
  directory: string,
): Promise<Response> {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-cache",
  };
  const error = (message: string, status: number) =>
    new Response(request.method === "HEAD" ? null : message, {
      status,
      headers,
    });
  if (!["GET", "HEAD"].includes(request.method))
    return new Response(null, {
      status: 405,
      headers: { ...headers, Allow: "GET, HEAD" },
    });
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname);
  } catch {
    return error("Некорректный адрес.", 400);
  }
  if (
    pathname.includes("\\") ||
    pathname.includes("\0") ||
    pathname.split("/").some((segment) => segment.startsWith("."))
  )
    return error("Доступ запрещён.", 403);

  try {
    const root = await realpath(directory);
    const filename = resolve(
      root,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (!filename.startsWith(`${root}${sep}`))
      return error("Доступ запрещён.", 403);
    // A symlink inside dist must not expose files outside it.
    const actual = await realpath(filename);
    if (!actual.startsWith(`${root}${sep}`))
      return error("Доступ запрещён.", 403);
    const info = await stat(actual);
    if (!info.isFile()) return error("Страница не найдена.", 404);
    return new Response(
      request.method === "HEAD"
        ? null
        : (Readable.toWeb(
            createReadStream(actual),
          ) as ReadableStream<Uint8Array>),
      {
        headers: {
          ...headers,
          "Content-Type":
            contentTypes[extname(actual)] ?? "application/octet-stream",
          "Content-Length": String(info.size),
          "Cache-Control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "no-cache",
        },
      },
    );
  } catch (cause) {
    if (
      ["ENOENT", "ENOTDIR"].includes(
        (cause as NodeJS.ErrnoException).code ?? "",
      )
    )
      return error("Страница не найдена.", 404);
    throw cause;
  }
}
