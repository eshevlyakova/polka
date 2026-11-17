import { afterAll, beforeAll, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { frontendResponse } from "../apps/backend/src/http/frontend";

let temporary: string;
let root: string;
const binary = new Uint8Array([0, 255, 137, 80, 78, 71, 13, 10]);
beforeAll(async () => {
  temporary = await mkdtemp(join(tmpdir(), "polka-hosting-"));
  root = join(temporary, "dist");
  await mkdir(join(root, "assets"), { recursive: true });
  await mkdir(join(root, "catalog"));
  await writeFile(
    join(root, "index.html"),
    "<!doctype html><title>Полка</title>",
  );
  await writeFile(join(root, "assets", "pear-test.png"), binary);
  await writeFile(join(root, "catalog", "recipe-library.json"), "[]");
  await writeFile(join(root, ".env"), "not-a-real-secret");
  await writeFile(join(temporary, "private.txt"), "not-public");
  await symlink(join(temporary, "private.txt"), join(root, "outside.txt"));
});
afterAll(async () => {
  await rm(temporary, { recursive: true, force: true });
});
const get = (path: string, method = "GET") =>
  frontendResponse(new Request(`https://polka.test${path}`, { method }), root);

it("serves the HTML build and binary images without corrupting their bytes", async () => {
  const html = await get("/");
  expect(html.status).toBe(200);
  expect(html.headers.get("Content-Type")).toContain("text/html");
  expect(await html.text()).toContain("Полка");
  const image = await get("/assets/pear-test.png");
  expect(image.headers.get("Content-Type")).toBe("image/png");
  expect(new Uint8Array(await image.arrayBuffer())).toEqual(binary);
  expect(image.headers.get("Cache-Control")).toContain("immutable");
  expect(image.headers.get("X-Content-Type-Options")).toBe("nosniff");
});

it("does not cache HTML/catalog permanently; HEAD has metadata without a body", async () => {
  const catalog = await get("/catalog/recipe-library.json");
  expect(catalog.headers.get("Cache-Control")).toBe("no-cache");
  expect(await catalog.json()).toEqual([]);
  const head = await get("/assets/pear-test.png", "HEAD");
  expect(head.status).toBe(200);
  expect(head.headers.get("Content-Length")).toBe(String(binary.length));
  expect(await head.text()).toBe("");
});

it("rejects hidden files, encoded traversal, backslashes, and escaping symlinks", async () => {
  for (const path of [
    "/.env",
    "/%2eenv",
    "/%2e%2e%2fprivate.txt",
    "/%5cprivate.txt",
    "/outside.txt",
  ])
    expect((await get(path)).status).toBe(403);
  expect((await get("/%zz")).status).toBe(400);
});

it("does not return the app HTML for missing files or accept writes", async () => {
  expect((await get("/missing.js")).status).toBe(404);
  expect((await get("/assets/")).status).toBe(404);
  const post = await get("/", "POST");
  expect(post.status).toBe(405);
  expect(post.headers.get("Allow")).toBe("GET, HEAD");
});
