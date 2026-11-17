import type { UserProfile } from "./model";
import { profileFields, validateProfile } from "../../../../shared/profile";
export { profileFields, validateProfile } from "../../../../shared/profile";

export function profileFromForm(data: FormData): UserProfile {
  const profile: UserProfile = { name: String(data.get("name") ?? "").trim() };
  for (const field of profileFields) {
    const raw = String(data.get(field.key) ?? "").trim();
    if (raw) profile[field.key] = Number(raw.replace(",", "."));
  }
  validateProfile(profile);
  return profile;
}
