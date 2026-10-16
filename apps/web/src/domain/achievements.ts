import type { AppState } from "./model";

export type Achievement = {
  id: "first" | "week" | "fortnight" | "cook" | "variety" | "own";
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
};

// Derived from saved records, including the prototype's demonstration history.
// Days with entries do not have to be consecutive. No new persistence is needed.
export function getAchievements(state: AppState): Achievement[] {
  const days = new Set(state.diary.map((entry) => entry.date)).size;
  const dishes = new Set(state.batches.map((batch) => batch.recipeName)).size;
  const definitions = [
    {
      id: "first",
      title: "Груша в деле",
      description: "Добавить еду в дневник хотя бы за один день.",
      current: days,
      target: 1,
    },
    {
      id: "week",
      title: "Неделя — тост!",
      description: "Собрать 7 дней с записями. Перерывы — это нормально.",
      current: days,
      target: 7,
    },
    {
      id: "fortnight",
      title: "Две недели всмятку",
      description: "Собрать 14 дней с записями в дневнике.",
      current: days,
      target: 14,
    },
    {
      id: "cook",
      title: "Шеф, всё готово!",
      description: "Приготовить первое блюдо из продуктов на полке.",
      current: state.batches.length,
      target: 1,
    },
    {
      id: "variety",
      title: "Вкусный эксперимент",
      description: "Приготовить 3 разных блюда.",
      current: dishes,
      target: 3,
    },
    {
      id: "own",
      title: "Секретный ингредиент",
      description: "Добавить свой продукт или блюдо в каталог.",
      current: state.customFoods.length,
      target: 1,
    },
  ] as const;
  return definitions.map((item) => ({
    ...item,
    current: Math.min(item.current, item.target),
    unlocked: item.current >= item.target,
  }));
}

/** Highest relative progress first; stable ties follow collection order. */
export function getNextAchievement(
  achievements: Achievement[],
): Achievement | undefined {
  return achievements
    .filter((item) => !item.unlocked)
    .sort((a, b) => b.current / b.target - a.current / a.target)[0];
}
