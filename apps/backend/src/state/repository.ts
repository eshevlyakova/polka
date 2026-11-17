import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type {
  Account,
  StateSnapshot,
  StateWrite,
} from "../../../../shared/account";
import { emptyState } from "../../../../shared/model";
import { parseAccountState } from "../../../../shared/accountState";

type Row = { revision: number; data: unknown };
const snapshot = (row: Row): StateSnapshot => ({
  revision: row.revision,
  state: parseAccountState(row.data),
});
export class StateConflict extends Error {
  constructor(
    public snapshot: StateSnapshot,
    public reusedId = false,
  ) {
    super(
      reusedId
        ? "Нельзя использовать номер сохранения для других данных."
        : "Данные изменились на другом устройстве. Они обновлены; проверь действие и повтори его.",
    );
  }
}

/** A small, versioned JSONB aggregate avoids partial pantry/diary/batch writes. */
export class UserStateRepository {
  constructor(private pool: Pool) {}

  async load(user: Account): Promise<StateSnapshot> {
    const state = {
      ...emptyState(),
      profile: { name: user.displayName.slice(0, 60) },
    };
    await this.pool.query(
      "INSERT INTO polka_user_states (user_id, data) VALUES ($1, $2::jsonb) ON CONFLICT (user_id) DO NOTHING",
      [user.id, JSON.stringify(state)],
    );
    const result = await this.pool.query<Row>(
      "SELECT revision, data FROM polka_user_states WHERE user_id = $1",
      [user.id],
    );
    return snapshot(result.rows[0]);
  }

  async save(user: Account, write: StateWrite): Promise<StateSnapshot> {
    await this.load(user);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<Row>(
        "SELECT revision, data FROM polka_user_states WHERE user_id = $1 FOR UPDATE",
        [user.id],
      );
      const current = snapshot(result.rows[0]);
      const hash = createHash("sha256")
        .update(
          JSON.stringify({ revision: write.revision, state: write.state }),
        )
        .digest("hex");
      const previous = await client.query<{ payload_hash: string }>(
        "SELECT payload_hash FROM polka_state_writes WHERE user_id = $1 AND mutation_id = $2",
        [user.id, write.mutationId],
      );
      if (previous.rows[0]) {
        if (previous.rows[0].payload_hash !== hash)
          throw new StateConflict(current, true);
        await client.query("COMMIT");
        return current; // A lost response can be retried, even after another device wrote.
      }
      if (current.revision !== write.revision) throw new StateConflict(current);
      const revision = current.revision + 1;
      await client.query(
        "UPDATE polka_user_states SET data = $2::jsonb, revision = $3, updated_at = now() WHERE user_id = $1",
        [user.id, JSON.stringify(write.state), revision],
      );
      await client.query(
        "INSERT INTO polka_state_writes (user_id, mutation_id, payload_hash, applied_revision) VALUES ($1, $2, $3, $4)",
        [user.id, write.mutationId, hash, revision],
      );
      await client.query(
        "UPDATE polka_users SET onboarding_completed_at = CASE WHEN $2 THEN coalesce(onboarding_completed_at, now()) ELSE onboarding_completed_at END, updated_at = now() WHERE id = $1",
        [user.id, write.state.settings.onboarded],
      );
      await client.query("COMMIT");
      return { state: write.state, revision };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
