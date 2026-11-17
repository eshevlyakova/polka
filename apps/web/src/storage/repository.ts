import { emptyState, type AppState } from "../domain/model";
import { parseState } from "../../../../shared/state";
export { parseState } from "../../../../shared/state";
export interface StateRepository {
  load(): AppState;
  save(state: AppState): void;
}
export class LocalRepository implements StateRepository {
  constructor(
    private storage: Storage,
    private key: string,
  ) {}
  load() {
    const raw = this.storage.getItem(this.key);
    return raw ? parseState(JSON.parse(raw)) : emptyState();
  }
  save(state: AppState) {
    this.storage.setItem(this.key, JSON.stringify(state));
  }
}
