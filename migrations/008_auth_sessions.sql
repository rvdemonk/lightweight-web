-- Auth sessions: token expiry, multi-device, revocation
-- Replaces the single token column on users table

CREATE TABLE auth_sessions (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    token      TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);

CREATE INDEX idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);

-- Migrate existing tokens into auth_sessions (30-day expiry from now)
INSERT INTO auth_sessions (user_id, token, created_at, expires_at)
SELECT id, token, created_at, datetime('now', '+30 days')
FROM users
WHERE token IS NOT NULL AND token != '';

-- SQLite cannot DROP COLUMN in older versions, but 3.35+ can.
-- The column stays but is no longer used by application code.
-- Clean it out so it's not confusing.
UPDATE users SET token = NULL;
