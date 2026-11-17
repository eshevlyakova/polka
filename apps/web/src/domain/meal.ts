export function currentMeal(now = new Date()) {
  const hour = now.getHours();
  return hour < 11
    ? "Завтрак"
    : hour < 16
      ? "Обед"
      : hour < 22
        ? "Ужин"
        : "Перекус";
}
