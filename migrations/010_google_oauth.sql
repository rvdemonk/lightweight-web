PRAGMA foreign_keys=OFF;
BEGIN;

-- Add google_id and email columns, make username and password_hash nullable
-- for Google-only users who have no credentials.
CREATE TABLE users_new (
    id            INTEGER PRIMARY KEY,
    username      TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    google_id     TEXT UNIQUE,
    email         TEXT,
    invite_quota  INTEGER NOT NULL DEFAULT 10,
    token         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new (id, username, password_hash, invite_quota, token, created_at)
    SELECT id, username, password_hash, invite_quota, token, created_at FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX idx_users_google_id ON users(google_id);

COMMIT;
PRAGMA foreign_keys=ON;
