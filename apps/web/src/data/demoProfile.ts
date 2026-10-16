import { localDate, type UserProfile } from "../domain/model";
/** Fictional person and measurements for the university prototype. */
export function createDemoProfile(now = new Date()): UserProfile {
  return {
    demo: true,
    name: "Анна",
    age: 23,
    heightCm: 168,
    weightKg: 65.4,
    targetWeightKg: 62,
    weightHistory: [
      [-27, 67.2],
      [-23, 67],
      [-19, 66.7],
      [-15, 66.8],
      [-11, 66.3],
      [-7, 66],
      [-3, 65.6],
      [0, 65.4],
    ].map(([offset, kg]) => {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      return { date: localDate(date), kg };
    }),
  };
}
