import { expect, it } from "vitest";
import {
  profileFromForm,
  validateProfile,
} from "../apps/web/src/domain/profile";
import { emptyState } from "../apps/web/src/domain/model";
import {
  parseState,
  LocalRepository,
} from "../apps/web/src/storage/repository";

it("accepts old accounts and validates optional profile data", () => {
  expect(parseState(emptyState()).profile).toBeUndefined();
  expect(() =>
    parseState({ ...emptyState(), profile: { name: "Аня", age: -1 } }),
  ).toThrow();
  expect(() => validateProfile({ name: "", weightKg: Infinity })).toThrow();
  expect(() => validateProfile({ name: "", age: 20.5 })).toThrow();
});
it("parses optional values, decimal commas and trims names", () => {
  const data = new FormData();
  data.set("name", " Аня ");
  data.set("weightKg", "65,5");
  data.set("age", "23");
  const profile = profileFromForm(data);
  expect(profile).toEqual({ name: "Аня", age: 23, weightKg: 65.5 });
  data.set("targetWeightKg", "-5");
  expect(() => profileFromForm(data)).toThrow();
});
it("profile edits persist alongside pantry and diary without changing them", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as Storage;
  const repo = new LocalRepository(storage, "profile-test");
  const state = {
    ...emptyState(),
    profile: {
      name: "Аня",
      age: 23,
      heightCm: 168,
      weightKg: 65,
      targetWeightKg: 62,
    },
  };
  repo.save(state);
  expect(repo.load()).toEqual(state);
});
