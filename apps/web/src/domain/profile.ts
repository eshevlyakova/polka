import type { UserProfile } from "./model";

export const profileFields = [
  { key: "age", label: "Возраст", unit: "лет", min: 1, max: 120, step: 1 },
  { key: "heightCm", label: "Рост", unit: "см", min: 30, max: 250, step: 0.1 },
  {
    key: "weightKg",
    label: "Текущий вес",
    unit: "кг",
    min: 1,
    max: 500,
    step: 0.1,
  },
  {
    key: "targetWeightKg",
    label: "Желаемый вес",
    unit: "кг",
    min: 1,
    max: 500,
    step: 0.1,
  },
] as const;

export function validateProfile(value: unknown): asserts value is UserProfile {
  if (!value || typeof value !== "object")
    throw new Error("Некорректные данные профиля");
  const profile = value as Record<string, unknown>;
  if (typeof profile.name !== "string" || profile.name.length > 60)
    throw new Error("Имя должно быть не длиннее 60 символов");
  if (profile.demo !== undefined && typeof profile.demo !== "boolean")
    throw new Error("Некорректный профиль");
  if (profile.weightHistory !== undefined) {
    if (
      !Array.isArray(profile.weightHistory) ||
      !profile.weightHistory.every(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          typeof entry.date === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
          Number.isFinite(Date.parse(entry.date)) &&
          new Date(entry.date).toISOString().slice(0, 10) === entry.date &&
          typeof entry.kg === "number" &&
          Number.isFinite(entry.kg) &&
          entry.kg >= 1 &&
          entry.kg <= 500,
      )
    )
      throw new Error("Некорректная история веса");
  }
  for (const field of profileFields) {
    const number = profile[field.key];
    if (
      number !== undefined &&
      (typeof number !== "number" ||
        !Number.isFinite(number) ||
        number < field.min ||
        number > field.max ||
        (field.key === "age" && !Number.isInteger(number)))
    ) {
      throw new Error(
        `${field.label}: укажи значение от ${field.min} до ${field.max}`,
      );
    }
  }
}
export function profileFromForm(data: FormData): UserProfile {
  const profile: UserProfile = { name: String(data.get("name") ?? "").trim() };
  for (const field of profileFields) {
    const raw = String(data.get(field.key) ?? "").trim();
    if (raw) profile[field.key] = Number(raw.replace(",", "."));
  }
  validateProfile(profile);
  return profile;
}
