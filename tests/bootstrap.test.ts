// @vitest-environment jsdom
import { beforeEach, it, expect } from "vitest";
import { bootstrapPrototype } from "../apps/web/src/storage/bootstrap";
import { LocalRepository } from "../apps/web/src/storage/repository";
import { emptyState } from "../apps/web/src/domain/model";
import { createDemoState } from "../apps/web/src/data/demo";
const key = "bootstrap-test";
const repo = new LocalRepository(localStorage, key);
beforeEach(() => localStorage.clear());
it("migrates an old empty account only once", () => {
  repo.save(emptyState());
  const seeded = bootstrapPrototype(
    repo,
    localStorage,
    key,
    new Date("2026-10-16T12:00:00"),
  );
  expect(seeded.pantry).toHaveLength(11);
  expect(seeded.diary.length).toBeGreaterThan(30);
  repo.save(emptyState());
  expect(bootstrapPrototype(repo, localStorage, key).diary).toHaveLength(0);
});
it("preserves real entries instead of replacing them", () => {
  const state = emptyState();
  state.pantry = [{ id: "my-eggs", foodId: "egg", grams: 123, expiresOn: "" }];
  repo.save(state);
  expect(bootstrapPrototype(repo, localStorage, key)).toEqual(state);
});
it("rebases fictional dates while preserving deletions and edited quantities", () => {
  const old = createDemoState(new Date("2026-10-10T12:00:00"));
  old.pantry = old.pantry.slice(1);
  old.pantry[0].grams = 123;
  repo.save(old);
  const shifted = bootstrapPrototype(
    repo,
    localStorage,
    key,
    new Date("2026-10-16T12:00:00"),
  );
  expect(shifted.pantry).toHaveLength(10);
  expect(shifted.pantry[0].grams).toBe(123);
  expect(
    shifted.diary
      .map((e) => e.date)
      .sort()
      .at(-1),
  ).toBe("2026-10-16");
});
