import { it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { validateInitData } from "../apps/bot/src/auth";
function signed(now: number) {
  const p = new URLSearchParams({
    auth_date: String(now),
    user: JSON.stringify({ id: 123 }),
    query_id: "test",
  });
  const text = [...p.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData")
    .update("TEST_TOKEN")
    .digest();
  p.set("hash", createHmac("sha256", secret).update(text).digest("hex"));
  return p.toString();
}
it("accepts signed initData; rejects tampering, expired data and missing fields", async () => {
  const raw = signed(100000);
  expect(await validateInitData(raw, "TEST_TOKEN", 100010)).toBe(123);
  await expect(
    validateInitData(raw.replace("123", "456"), "TEST_TOKEN", 100010),
  ).rejects.toThrow();
  await expect(validateInitData(raw, "TEST_TOKEN", 104000)).rejects.toThrow();
  await expect(validateInitData("", "TEST_TOKEN", 100010)).rejects.toThrow();
});
