-- Remake beta_signups: nullable user_id + unique email
CREATE TABLE IF NOT EXISTS beta_signups_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    email TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL,
    referrer TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'pending'
);

INSERT OR IGNORE INTO beta_signups_new (id, user_id, email, platform, referrer, created_at, status)
    SELECT id, user_id, email, platform, referrer, created_at, status
    FROM beta_signups;

DROP TABLE beta_signups;
ALTER TABLE beta_signups_new RENAME TO beta_signups;
