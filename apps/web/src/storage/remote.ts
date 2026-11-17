import type { StateSnapshot, StateWrite } from "../../../../shared/account";
import { uuidPattern } from "../../../../shared/account";
import type { AppState } from "../domain/model";
import { parseAccountState } from "../../../../shared/accountState";
import {
  AccountApiError,
  parseSnapshot,
  saveAccountState,
} from "../api/account";

/** localStorage holds only a per-account unacknowledged write, not the source of truth. */
export class RemoteRepository {
  readonly pendingKey: string;
  private pendingWrite: StateWrite | null = null;
  constructor(
    readonly accountId: string,
    public snapshot: StateSnapshot,
    private storage: Storage,
    private saveRemote = (write: StateWrite) =>
      saveAccountState(write, accountId),
  ) {
    this.pendingKey = `polka:account:${accountId}:pending-v1`;
  }

  restorePending(): boolean {
    const raw = this.storage.getItem(this.pendingKey);
    if (!raw) return false;
    const value = JSON.parse(raw) as StateWrite;
    const snapshot = parseSnapshot(value);
    if (!uuidPattern.test(value.mutationId))
      throw new Error(
        "Не удалось прочитать незавершённое сохранение. Оно не удалено.",
      );
    this.pendingWrite = { ...snapshot, mutationId: value.mutationId };
    return true;
  }
  async save(next: AppState) {
    if (this.pendingWrite)
      throw new Error("Сначала заверши предыдущее сохранение.");
    const write = {
      state: parseAccountState(next),
      revision: this.snapshot.revision,
      mutationId: crypto.randomUUID(),
    };
    // Persist BEFORE sending: a lost response must reuse the exact write after reload.
    try {
      this.storage.setItem(this.pendingKey, JSON.stringify(write));
    } catch {
      throw new Error(
        "Не удалось сохранить черновик на устройстве. Освободи место и повтори действие; серверные данные не изменены.",
      );
    }
    this.pendingWrite = write;
    return this.retry();
  }
  async retry(): Promise<StateSnapshot> {
    if (!this.pendingWrite) return this.snapshot;
    try {
      const saved = await this.saveRemote(this.pendingWrite);
      this.snapshot = saved;
      this.clearPending();
      return saved;
    } catch (error) {
      if (
        error instanceof AccountApiError &&
        (error.status === 409 || error.status === 400 || error.status === 413)
      ) {
        if (error.snapshot) this.snapshot = error.snapshot;
        this.clearPending(); // Definitive rejection, never a network/ambiguous failure.
      }
      throw error;
    }
  }
  get hasPending() {
    return this.pendingWrite !== null;
  }
  private clearPending() {
    this.pendingWrite = null;
    try {
      this.storage.removeItem(this.pendingKey);
    } catch {
      /* Already acknowledged; a retained receipt is safe to replay. */
    }
  }
}
