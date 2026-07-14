-- Phase 0 server-data repair (iOS port workorder, 2026-07-14)
-- Pushes the two template definitions that Android sync never sent,
-- and backfills template_id on the two orphaned sessions.
-- Duplicate-lineage merge NOT needed server-side: verified 2026-07-14 that
-- resolve-by-name already unified all 6 split lineages on arrival
-- (set counts match golden backup exactly, 80 sessions / 856 sets).
--
-- Rehearsed on backups/2026-07-14/lightweight.db.phase0-ios-port before prod.

BEGIN;

-- Upper X (phone template 9 → server id 14), v1, timestamps from golden backup
INSERT INTO templates (id, user_id, name, created_at, updated_at, version)
VALUES (14, 1, 'Upper X', '2026-07-07T05:44:51.574Z', '2026-07-07T05:44:51.574Z', 1);

INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
VALUES
  (14,   1, 1, 3, 8, 12),  -- INCLINE BARBELL BENCH
  (14,   4, 2, 3, 8, 12),  -- BENT OVER ROW
  (14,  18, 3, 3, 8, 12),  -- PULL-UPS (phone "Pull Up" lineage, unified server-side)
  (14, 219, 4, 3, 8, 15),  -- DUMBBELL CHEST FLY
  (14,  16, 5, 3, 8, 12),  -- HANGING LEG RAISE
  (14,  40, 6, 3, 8, 12);  -- BRIEFCASE CARRY

-- Lower X (phone template 10 → server id 15), v2 (edited on phone), timestamps from golden backup
INSERT INTO templates (id, user_id, name, created_at, updated_at, version)
VALUES (15, 1, 'Lower X', '2026-07-09T05:46:57.904Z', '2026-07-09T05:47:28.950Z', 2);

INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
VALUES
  (15,  11, 1, 3,  6, 12),  -- BACK SQUAT
  (15,  14, 2, 3, 10, 14),  -- ROMANIAN DEADLIFT
  (15,  16, 3, 3,  8, 12),  -- HANGING LEG RAISE
  (15,  40, 4, 3,  8, 12);  -- BRIEFCASE CARRY

-- Backfill the two orphaned sessions (matched by exact started_at to golden backup)
UPDATE sessions SET template_id = 14, template_version = 1
 WHERE id = 94 AND user_id = 1 AND started_at = '2026-07-07T05:44:56.179Z';

UPDATE sessions SET template_id = 15, template_version = 2
 WHERE id = 96 AND user_id = 1 AND started_at = '2026-07-09T05:47:38.319Z';

COMMIT;
