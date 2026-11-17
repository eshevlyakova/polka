import { createDemoProfile } from "../data/demoProfile";
import { createDemoState } from "../data/demo";
import { localDate, type AppState } from "../domain/model";
import type { StateRepository } from "./repository";
/** Migrate an old EMPTY prototype once. Never replace an account containing real entries. */
export function bootstrapPrototype(
  repo: StateRepository,
  storage: Storage,
  key: string,
  now = new Date(),
): AppState {
  const marker = `${key}:demo-ready-v3`;
  const exists = storage.getItem(key) !== null;
  let current = exists ? repo.load() : null;
  const empty =
    current &&
    !current.pantry.length &&
    !current.diary.length &&
    !current.batches.length &&
    !current.customFoods.length &&
    !current.profile &&
    !current.aiRecipes?.length;
  if (!current || (empty && !storage.getItem(marker))) {
    const next = createDemoState(now);
    repo.save(next);
    storage.setItem(marker, "1");
    storage.setItem(`${key}:demo-scenarios-v1`, "1");
    storage.setItem(`${key}:profile-demo-v1`, "1");
    return next;
  }
  storage.setItem(marker, "1");
  // Keep a wholly fictional account current when it is opened on another day.
  // Shift dates only: deleted products and edited amounts stay intact.
  const onlyDemo =
    current.diary.length > 0 &&
    current.diary.every((e) => e.id.startsWith("demo-")) &&
    current.pantry.every((p) => p.id.startsWith("demo-")) &&
    current.batches.every((b) => b.id.startsWith("demo-")) &&
    !current.customFoods.length &&
    (!current.profile || current.profile.demo === true) &&
    !current.aiRecipes?.length;
  // Add new fictional examples once, without replacing stocks, edits or real accounts.
  if (!storage.getItem(`${key}:demo-scenarios-v1`)) {
    if (
      onlyDemo &&
      current.batches.length === 1 &&
      current.batches[0].id === "demo-cooked-chicken" &&
      Math.abs(current.batches[0].remainingFraction - 1 / 3) < 1e-6
    ) {
      const fixtures = createDemoState(
        new Date(
          current.diary
            .map((e) => e.date)
            .sort()
            .at(-1)! + "T12:00:00",
        ),
      );
      current = {
        ...current,
        batches: [
          ...current.batches,
          ...fixtures.batches.filter((b) => b.id !== "demo-cooked-chicken"),
        ],
        pantry: current.pantry.map((p) => ({
          ...p,
          addedAt:
            p.addedAt ??
            fixtures.pantry.find((f) => f.foodId === p.foodId)?.addedAt,
        })),
      };
      repo.save(current);
    }
    storage.setItem(`${key}:demo-scenarios-v1`, "1");
  }
  if (
    onlyDemo &&
    !current.profile &&
    !storage.getItem(`${key}:profile-demo-v1`)
  ) {
    current = {
      ...current,
      profile: createDemoProfile(
        new Date(
          current.diary
            .map((entry) => entry.date)
            .sort()
            .at(-1)! + "T12:00:00",
        ),
      ),
    };
    repo.save(current);
    storage.setItem(`${key}:profile-demo-v1`, "1");
  }
  if (onlyDemo && !storage.getItem(`${key}:demo-weights-v1`)) {
    const fixtures = createDemoState(now);
    current = {
      ...current,
      batches: current.batches.map((b) => ({
        ...b,
        estimatedWeightGrams:
          b.estimatedWeightGrams ??
          fixtures.batches.find((f) => f.id === b.id)?.estimatedWeightGrams,
      })),
    };
    repo.save(current);
    storage.setItem(`${key}:demo-weights-v1`, "1");
  }
  const latest = current.diary
    .map((e) => e.date)
    .sort()
    .at(-1);
  const today = localDate(now);
  if (onlyDemo && latest && latest < today) {
    const days = Math.round(
      (Date.parse(today + "T12:00:00Z") - Date.parse(latest + "T12:00:00Z")) /
        86400000,
    );
    const shift = (value: string) => {
      if (!value) return value;
      const date = new Date(value + "T12:00:00");
      date.setDate(date.getDate() + days);
      return localDate(date);
    };
    const next = {
      ...current,
      profile: current.profile?.demo
        ? {
            ...current.profile,
            weightHistory: current.profile.weightHistory?.map((entry) => ({
              ...entry,
              date: shift(entry.date),
            })),
          }
        : current.profile,
      diary: current.diary.map((e) => ({ ...e, date: shift(e.date) })),
      pantry: current.pantry.map((p) => ({
        ...p,
        expiresOn: shift(p.expiresOn),
        ...(p.addedAt
          ? {
              addedAt: new Date(
                Date.parse(p.addedAt) + days * 86400000,
              ).toISOString(),
            }
          : {}),
      })),
      batches: current.batches.map((b) => {
        const date = new Date(b.cookedAt);
        date.setDate(date.getDate() + days);
        return { ...b, cookedAt: date.toISOString() };
      }),
    };
    repo.save(next);
    return next;
  }
  return current;
}
