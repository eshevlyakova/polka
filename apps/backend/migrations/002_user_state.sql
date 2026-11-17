-- Versioned aggregate: a cooking/intake edit replaces all affected sections atomically.
-- Public catalogues remain separate, and are never copied into a user's account.
CREATE TABLE polka_user_states (
  user_id uuid PRIMARY KEY REFERENCES polka_users(id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE polka_state_writes (
  user_id uuid NOT NULL REFERENCES polka_users(id) ON DELETE CASCADE,
  mutation_id uuid NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  applied_revision integer NOT NULL CHECK (applied_revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mutation_id)
);
