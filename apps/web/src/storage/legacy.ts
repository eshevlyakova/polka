import type { Account } from "../../../../shared/account";
import type { AppState } from "../domain/model";
import { parseState } from "./repository";

export type LegacySave = { key: string; state: AppState; demo: boolean };
/** Only offer data explicitly; never overwrite, remove or rebase an old local save. */
export function legacySaves(storage: Storage, account: Account) {
  const saves: LegacySave[] = [];
  let unreadable = false;
  for (const key of [`polka:v1:${account.telegramId}`, "polka:v1:browser"]) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const state = parseState(JSON.parse(raw));
      if (
        !state.pantry.length &&
        !state.diary.length &&
        !state.batches.length &&
        !state.customFoods.length &&
        !state.profile
      )
        continue;
      const entries = [...state.pantry, ...state.diary, ...state.batches];
      saves.push({
        key,
        state,
        demo:
          !state.customFoods.length &&
          entries.length > 0 &&
          entries.every((e) => e.id.startsWith("demo-")) &&
          (!state.profile || state.profile.demo === true),
      });
    } catch {
      unreadable = true;
    }
  }
  return { saves, unreadable };
}
