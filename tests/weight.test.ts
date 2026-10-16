import { expect, it } from "vitest";
import { recordWeight, updateProfile } from "../apps/web/src/domain/weight";
import { createDemoProfile } from "../apps/web/src/data/demoProfile";
import { bootstrapPrototype } from "../apps/web/src/storage/bootstrap";
import { LocalRepository } from "../apps/web/src/storage/repository";
import { createDemoState } from "../apps/web/src/data/demo";

it("replaces same-day values and retains latest weight for backdated entries", () => {
  const profile = createDemoProfile(new Date("2026-10-16T12:00:00"));
  const changed = recordWeight(profile, 65.7, "2026-10-16", "2026-10-16");
  expect(changed.weightHistory).toHaveLength(8);
  expect(changed.weightKg).toBe(65.7);
  expect(recordWeight(changed, 67, "2026-10-01", "2026-10-16").weightKg).toBe(
    65.7,
  );
  expect(changed.demo).toBe(false);
});
it("rejects invalid measurements, impossible and future dates", () => {
  for (const [kg, date] of [
    [0, "2026-10-16"],
    [NaN, "2026-10-16"],
    [600, "2026-10-16"],
    [65, "2026-02-30"],
    [65, "2026-10-17"],
  ] as const) {
    expect(() => recordWeight({ name: "" }, kg, date, "2026-10-16")).toThrow();
  }
});
it("editing profile preferences preserves weight history and removes demo status", () => {
  const profile = createDemoProfile();
  const next = updateProfile(profile, {
    name: "Анна",
    weightKg: 65.4,
    targetWeightKg: 61,
  });
  expect(next.weightHistory).toEqual(profile.weightHistory);
  expect(next.targetWeightKg).toBe(61);
  expect(next.demo).toBe(false);
});
it("upgrades an existing demo without touching quantities and rebases dates consistently", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as Storage;
  const repo = new LocalRepository(storage, "demo");
  const state = createDemoState(new Date("2026-10-10T12:00:00"));
  delete state.profile;
  state.pantry[0].grams = 123;
  repo.save(state);
  const next = bootstrapPrototype(
    repo,
    storage,
    "demo",
    new Date("2026-10-16T12:00:00"),
  );
  expect(next.profile?.name).toBe("Анна");
  expect(next.profile?.weightHistory?.at(-1)?.date).toBe("2026-10-16");
  expect(next.pantry[0].grams).toBe(123);
  const edited = { ...next, profile: { name: "Мария", weightKg: 70 } };
  repo.save(edited);
  expect(
    bootstrapPrototype(repo, storage, "demo", new Date("2026-10-17T12:00:00")),
  ).toEqual(edited);
});
