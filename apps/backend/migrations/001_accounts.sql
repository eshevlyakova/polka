CREATE TABLE polka_users (
  id uuid PRIMARY KEY,
  telegram_id bigint NOT NULL UNIQUE CHECK (telegram_id > 0),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 160),
  username text,
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE polka_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid NOT NULL REFERENCES polka_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX polka_sessions_user_idx ON polka_sessions(user_id);
CREATE INDEX polka_sessions_expiry_idx ON polka_sessions(expires_at);
