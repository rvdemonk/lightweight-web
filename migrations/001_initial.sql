CREATE TABLE exercises (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    muscle_group TEXT,
    equipment   TEXT,
    notes       TEXT,
    archived    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE templates (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    notes       TEXT,
    archived    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE template_exercises (
    id              INTEGER PRIMARY KEY,
    template_id     INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    exercise_id     INTEGER NOT NULL REFERENCES exercises(id),
    position        INTEGER NOT NULL,
    target_sets     INTEGER,
    target_reps_min INTEGER,
    target_reps_max INTEGER,
    rest_seconds    INTEGER,
    notes           TEXT,
    UNIQUE(template_id, position)
);

CREATE TABLE sessions (
    id              INTEGER PRIMARY KEY,
    template_id     INTEGER REFERENCES templates(id),
    name            TEXT,
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at        TEXT,
    paused_duration INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE session_exercises (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id     INTEGER NOT NULL REFERENCES exercises(id),
    position        INTEGER NOT NULL,
    notes           TEXT,
    UNIQUE(session_id, position)
);

CREATE TABLE sets (
    id                  INTEGER PRIMARY KEY,
    session_exercise_id INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
    set_number          INTEGER NOT NULL,
    weight_kg           REAL,
    reps                INTEGER NOT NULL,
    set_type            TEXT NOT NULL DEFAULT 'working',
    completed_at        TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_exercise_id, set_number)
);

CREATE TABLE auth (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash   TEXT NOT NULL,
    token           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_template ON sessions(template_id);
CREATE INDEX idx_sessions_started ON sessions(started_at);
CREATE INDEX idx_sets_session_exercise ON sets(session_exercise_id);
