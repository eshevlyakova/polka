// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { RemoteRepository } from "../apps/web/src/storage/remote";
import { legacySaves } from "../apps/web/src/storage/legacy";
import { AccountApiError } from "../apps/web/src/api/account";
import { emptyState } from "../shared/model";
import { parseAccountState } from "../shared/accountState";
import { createDemoState } from "../apps/web/src/data/demo";
import type { StateWrite } from "../shared/account";

afterEach(() => localStorage.clear());
const user = {
  id: "00000000-0000-0000-0000-000000000001",
  telegramId: "100",
  displayName: "Анна",
  username: null,
  onboardingCompletedAt: null,
};
it("retains a lost-response write across reload and retries exactly its original id, version and payload", async () => {
  const writes: StateWrite[] = [];
  const save = vi.fn(async (write: StateWrite) => {
    writes.push(structuredClone(write));
    if (writes.length === 1) throw new AccountApiError("Ответ потерялся", 0);
    return { revision: 1, state: write.state };
  });
  const repo = new RemoteRepository(
    user.id,
    { state: emptyState(), revision: 0 },
    localStorage,
    save,
  );
  const next = { ...emptyState(), profile: { name: "Анна" } };
  await expect(repo.save(next)).rejects.toThrow("потерялся");
  expect(repo.snapshot.revision).toBe(0);
  expect(repo.hasPending).toBe(true);
  const reloaded = new RemoteRepository(
    user.id,
    { state: emptyState(), revision: 0 },
    localStorage,
    save,
  );
  expect(reloaded.restorePending()).toBe(true);
  expect(await reloaded.retry()).toEqual({ state: next, revision: 1 });
  expect(writes[1]).toEqual(writes[0]);
  expect(localStorage.getItem(repo.pendingKey)).toBeNull();
});
it("does not expose another account's draft and never silently overwrites on conflict", async () => {
  const latest = {
    state: { ...emptyState(), profile: { name: "Другое устройство" } },
    revision: 2,
  };
  const repo = new RemoteRepository(
    user.id,
    { state: emptyState(), revision: 1 },
    localStorage,
    async () => {
      throw new AccountApiError("Конфликт", 409, latest);
    },
  );
  await expect(repo.save(emptyState())).rejects.toThrow("Конфликт");
  expect(repo.snapshot).toEqual(latest);
  expect(repo.hasPending).toBe(false);
  localStorage.setItem(
    repo.pendingKey,
    JSON.stringify({
      revision: 1,
      state: emptyState(),
      mutationId: crypto.randomUUID(),
    }),
  );
  const other = new RemoteRepository(
    "00000000-0000-0000-0000-000000000002",
    latest,
    localStorage,
  );
  expect(other.restorePending()).toBe(false);
});
it("does not send a write when the recovery draft cannot be persisted", async () => {
  const save = vi.fn();
  const broken = {
    setItem: () => {
      throw new Error("quota");
    },
  } as unknown as Storage;
  const repo = new RemoteRepository(
    user.id,
    { state: emptyState(), revision: 0 },
    broken,
    save,
  );
  await expect(repo.save(emptyState())).rejects.toThrow("черновик");
  expect(save).not.toHaveBeenCalled();
});
it("offers only this Telegram identity and explicit browser saves, without modifying them", () => {
  const data = JSON.stringify(createDemoState(new Date("2026-10-10T12:00:00")));
  localStorage.setItem("polka:v1:browser", data);
  localStorage.setItem("polka:v1:999", data);
  const result = legacySaves(localStorage, user);
  expect(result.saves).toHaveLength(1);
  expect(result.saves[0].demo).toBe(true);
  expect(localStorage.getItem("polka:v1:browser")).toBe(data);
  expect(localStorage.getItem("polka:v1:999")).toBe(data);
  expect(parseAccountState(result.saves[0].state).diary.length).toBeGreaterThan(
    20,
  );
});
it("rejects duplicate IDs, impossible dates, unknown foods and eating beyond the entire batch", () => {
  const state = createDemoState();
  expect(() => parseAccountState(state)).not.toThrow();
  for (const mutate of [
    (s: typeof state) => {
      s.pantry.push(s.pantry[0]);
    },
    (s: typeof state) => {
      s.diary[0].date = "2026-02-30";
    },
    (s: typeof state) => {
      s.pantry[0].foodId = "unknown";
    },
    (s: typeof state) => {
      s.batches.find((b) => b.id === "demo-cooked-chicken")!.remainingFraction =
        0.9;
    },
  ]) {
    const changed = structuredClone(state);
    mutate(changed);
    expect(() => parseAccountState(changed)).toThrow();
  }
});
