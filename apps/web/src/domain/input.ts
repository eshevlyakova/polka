import { localDate } from "./model";
export const inputNumber = (data: FormData, key: string, min = 0) => {
  const value = Number(data.get(key));
  if (!Number.isFinite(value) || value < min)
    throw new Error("Проверь числовые значения");
  return value;
};
export const expiryDays = (date: string) =>
  date
    ? Math.round(
        (Date.parse(date + "T12:00:00") -
          Date.parse(localDate() + "T12:00:00")) /
          86400000,
      )
    : null;
