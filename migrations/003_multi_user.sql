PRAGMA foreign_keys=OFF;
BEGIN;

-- 1. Create users table
CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    token         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Migrate Lewis's auth data
INSERT INTO users (id, username, password_hash, token)
    SELECT 1, 'lewis', password_hash, token FROM auth;

-- 3. Recreate exercises with user_id
CREATE TABLE exercises_new (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    muscle_group TEXT,
    equipment   TEXT,
    notes       TEXT,
    archived    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
);
INSERT INTO exercises_new (id, user_id, name, muscle_group, equipment, notes, archived, created_at)
    SELECT id, 1, name, muscle_group, equipment, notes, archived, created_at FROM exercises;
DROP TABLE exercises;
ALTER TABLE exercises_new RENAME TO exercises;

-- 4. Recreate templates with user_id
CREATE TABLE templates_new (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    notes       TEXT,
    archived    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
);
INSERT INTO templates_new (id, user_id, name, notes, archived, created_at, updated_at)
    SELECT id, 1, name, notes, archived, created_at, updated_at FROM templates;
DROP TABLE templates;
ALTER TABLE templates_new RENAME TO templates;

-- 5. Recreate sessions with user_id
CREATE TABLE sessions_new (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    template_id     INTEGER REFERENCES templates(id),
    name            TEXT,
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at        TEXT,
    paused_duration INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
);
INSERT INTO sessions_new (id, user_id, template_id, name, started_at, ended_at, paused_duration, notes, status)
    SELECT id, 1, template_id, name, started_at, ended_at, paused_duration, notes, status FROM sessions;
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

-- 6. Recreate indexes
CREATE INDEX idx_sessions_template ON sessions(template_id);
CREATE INDEX idx_sessions_started ON sessions(started_at);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_exercises_user ON exercises(user_id);
CREATE INDEX idx_templates_user ON templates(user_id);

-- 7. Drop old auth table
DROP TABLE auth;

COMMIT;
PRAGMA foreign_keys=ON;
