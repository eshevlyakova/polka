import type { AppState } from "./model";

export type Account = {
  id: string;
  telegramId: string;
  displayName: string;
  username: string | null;
  onboardingCompletedAt: string | null;
};
export type StateSnapshot = { state: AppState; revision: number };
export type StateWrite = StateSnapshot & { mutationId: string };
export const STATE_BODY_LIMIT = 4 * 1024 * 1024;
export const uuidPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
