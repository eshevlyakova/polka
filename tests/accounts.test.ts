import { it, expect } from "vitest";
import { handleRequest } from "../apps/backend/src/router";
it("keeps account routes closed when storage is not configured, without breaking the public catalogue", async () => {
  const response = await handleRequest(
    new Request("https://polka.test/api/me"),
    {},
  );
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain("не настроено");
  const health = await handleRequest(
    new Request("https://polka.test/api/health"),
    {},
  );
  expect(health.status).toBe(200);
  expect((await health.json()).libraryRecipes).toBe(501);
});
it("rejects browser cross-origin account writes and form posts before accessing storage", async () => {
  const foreign = await handleRequest(
    new Request("https://polka.test/api/auth/telegram", {
      method: "POST",
      headers: {
        Origin: "https://foreign.test",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
    {},
  );
  expect(foreign.status).toBe(403);
  const form = await handleRequest(
    new Request("https://polka.test/api/auth/telegram", {
      method: "POST",
      body: "initData=bad",
    }),
    {},
  );
  expect(form.status).toBe(415);
});
