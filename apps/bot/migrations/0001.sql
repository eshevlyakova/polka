CREATE TABLE users (id INTEGER PRIMARY KEY, chat_id INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1);
CREATE TABLE updates (id INTEGER PRIMARY KEY, processed_at INTEGER NOT NULL);
CREATE TABLE reminders (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, due_at INTEGER NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', claimed_at INTEGER, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE INDEX reminders_due ON reminders(status,due_at);
CREATE INDEX reminders_user ON reminders(user_id);
