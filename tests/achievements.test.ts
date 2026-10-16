import { expect, it } from "vitest";
import {
  getAchievements,
  getNextAchievement,
} from "../apps/web/src/domain/achievements";
import { emptyState } from "../apps/web/src/domain/model";
import { createDemoState } from "../apps/web/src/data/demo";

it("empty accounts have no unlocked achievements", () => {
  expect(
    getAchievements(emptyState()).every(
      (item) => !item.unlocked && item.current === 0,
    ),
  ).toBe(true);
});
it("counts distinct diary dates rather than entries and recalculates after deletion", () => {
  const state = createDemoState();
  const dates = new Set(state.diary.map((entry) => entry.date));
  expect(dates.size).toBe(14);
  expect(
    getAchievements(state).find((item) => item.id === "fortnight")?.unlocked,
  ).toBe(true);
  const date = state.diary[0].date;
  state.diary = state.diary.filter((entry) => entry.date === date);
  expect(
    getAchievements(state).find((item) => item.id === "week")?.current,
  ).toBe(1);
  expect(
    getAchievements(state).find((item) => item.id === "week")?.unlocked,
  ).toBe(false);
});

it("suggests the closest unfinished achievement and handles a completed collection", () => {
  const achievements = getAchievements(createDemoState());
  expect(getNextAchievement(achievements)?.id).toBe("variety");
  expect(
    getNextAchievement(
      achievements.map((item) => ({
        ...item,
        current: item.target,
        unlocked: true,
      })),
    ),
  ).toBeUndefined();
  expect(getNextAchievement(getAchievements(emptyState()))?.id).toBe("first");
});
