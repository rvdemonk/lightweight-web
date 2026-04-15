CREATE TABLE IF NOT EXISTS beta_signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    email TEXT NOT NULL,
    platform TEXT NOT NULL,
    referrer TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'pending'
);
