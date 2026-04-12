-- Per-user invite links

ALTER TABLE users ADD COLUMN invite_quota INTEGER NOT NULL DEFAULT 5;

CREATE TABLE invites (
    id          INTEGER PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    created_by  INTEGER NOT NULL REFERENCES users(id),
    used_by     INTEGER REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    used_at     TEXT
);

CREATE INDEX idx_invites_code ON invites(code);
CREATE INDEX idx_invites_created_by ON invites(created_by);
