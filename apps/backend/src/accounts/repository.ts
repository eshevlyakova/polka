import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { Account } from "../../../../shared/account";
export type { Account } from "../../../../shared/account";
type AccountRow = {
  id: string;
  telegram_id: string;
  display_name: string;
  username: string | null;
  onboarding_completed_at: Date | null;
};
const account = (row: AccountRow): Account => ({
  id: row.id,
  telegramId: row.telegram_id,
  displayName: row.display_name,
  username: row.username,
  onboardingCompletedAt: row.onboarding_completed_at?.toISOString() ?? null,
});
export class AccountRepository {
  constructor(private pool: Pool) {}

  async signIn(
    identity: {
      telegramId: string;
      displayName: string;
      username: string | null;
    },
    tokenHash: string,
    now: Date,
    expiresAt: Date,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<AccountRow>(
        `INSERT INTO polka_users (id, telegram_id, display_name, username)
        VALUES ($1, $2, $3, $4) ON CONFLICT (telegram_id) DO UPDATE
        SET display_name = EXCLUDED.display_name, username = EXCLUDED.username, updated_at = now()
        RETURNING *`,
        [
          randomUUID(),
          identity.telegramId,
          identity.displayName,
          identity.username,
        ],
      );
      const user = result.rows[0];
      await client.query(
        "DELETE FROM polka_sessions WHERE user_id = $1 AND expires_at <= $2",
        [user.id, now],
      );
      await client.query(
        "INSERT INTO polka_sessions (token_hash, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)",
        [tokenHash, user.id, now, expiresAt],
      );
      await client.query("COMMIT");
      return account(user);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findSession(tokenHash: string, now: Date) {
    const result = await this.pool.query<AccountRow>(
      `SELECT u.* FROM polka_users u JOIN polka_sessions s ON s.user_id = u.id
      WHERE s.token_hash = $1 AND s.expires_at > $2`,
      [tokenHash, now],
    );
    return result.rows[0] ? account(result.rows[0]) : null;
  }
  async revokeSession(tokenHash: string) {
    await this.pool.query("DELETE FROM polka_sessions WHERE token_hash = $1", [
      tokenHash,
    ]);
  }
}
