import { localDate, type UserProfile, type WeightEntry } from "./model";
import { validateProfile } from "./profile";

export function sortedWeights(profile?: UserProfile): WeightEntry[] {
  return [...(profile?.weightHistory ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
export function recordWeight(
  profile: UserProfile,
  kg: number,
  date: string,
  today = localDate(),
): UserProfile {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date > today
  )
    throw new Error("Выбери дату не позже сегодняшней");
  const weightHistory = [
    ...(profile.weightHistory ?? []).filter((entry) => entry.date !== date),
    { date, kg },
  ].sort((a, b) => a.date.localeCompare(b.date));
  const next = {
    ...profile,
    demo: false,
    weightHistory,
    weightKg: weightHistory.at(-1)!.kg,
  };
  validateProfile(next);
  return next;
}
export function updateProfile(
  previous: UserProfile | undefined,
  next: UserProfile,
): UserProfile {
  const merged = {
    ...next,
    demo: false,
    weightHistory: previous?.weightHistory,
  };
  if (
    next.weightKg !== undefined &&
    (next.weightKg !== previous?.weightKg || !merged.weightHistory?.length)
  )
    return recordWeight(merged, next.weightKg, localDate());
  const latest = sortedWeights(merged).at(-1);
  return latest ? { ...merged, weightKg: latest.kg } : merged;
}
