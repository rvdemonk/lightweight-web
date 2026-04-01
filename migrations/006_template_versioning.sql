-- Template versioning: snapshot history on edit, stamp sessions with version

ALTER TABLE templates ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE sessions ADD COLUMN template_version INTEGER;

CREATE TABLE template_snapshots (
    id          INTEGER PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(template_id, version)
);

CREATE INDEX idx_template_snapshots_template ON template_snapshots(template_id);
