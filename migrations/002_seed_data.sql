-- Seed exercises
INSERT INTO exercises (name, muscle_group, equipment) VALUES
  ('Incline Barbell Bench', 'Chest', 'Barbell'),
  ('DB Chest Flies', 'Chest', 'Dumbbells'),
  ('Weighted Push-ups', 'Chest', 'Bodyweight'),
  ('Barbell Bent Row', 'Back', 'Barbell'),
  ('Chin-ups', 'Back', 'Bodyweight'),
  ('Egyptian Raises', 'Shoulders', 'Dumbbells'),
  ('DB Overhead Press', 'Shoulders', 'Dumbbells'),
  ('Seated Incline DB Curls', 'Biceps', 'Dumbbells'),
  ('Barbell Curls', 'Biceps', 'Barbell'),
  ('Overhead DB Tricep Extension', 'Triceps', 'Dumbbells'),
  ('Back Squat', 'Quads', 'Barbell'),
  ('Walking Lunges', 'Quads', 'Dumbbells'),
  ('Reverse Lunges', 'Quads', 'Dumbbells'),
  ('Romanian Deadlift', 'Hamstrings', 'Barbell'),
  ('Good Mornings', 'Hamstrings', 'Barbell'),
  ('Hanging Leg Raise', 'Core', 'Bodyweight'),
  ('Standing Calf Raise', 'Calves', 'Machine');

-- Seed templates

-- Upper A (Chest Primary)
INSERT INTO templates (name, notes) VALUES ('Upper A', 'Chest primary day');
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 1, 4, 6, 10 FROM templates t, exercises e WHERE t.name = 'Upper A' AND e.name = 'Incline Barbell Bench';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 2, 3, 10, 15 FROM templates t, exercises e WHERE t.name = 'Upper A' AND e.name = 'DB Chest Flies';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 3, 3, 12, 20 FROM templates t, exercises e WHERE t.name = 'Upper A' AND e.name = 'Egyptian Raises';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 4, 3, 10, 15 FROM templates t, exercises e WHERE t.name = 'Upper A' AND e.name = 'Seated Incline DB Curls';

-- Lower A (Squat Emphasis)
INSERT INTO templates (name, notes) VALUES ('Lower A', 'Squat emphasis day');
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 1, 4, 4, 8 FROM templates t, exercises e WHERE t.name = 'Lower A' AND e.name = 'Back Squat';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 2, 3, 8, 12 FROM templates t, exercises e WHERE t.name = 'Lower A' AND e.name = 'Walking Lunges';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 3, 3, 10, 15 FROM templates t, exercises e WHERE t.name = 'Lower A' AND e.name = 'Standing Calf Raise';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 4, 3, 8, 15 FROM templates t, exercises e WHERE t.name = 'Lower A' AND e.name = 'Hanging Leg Raise';

-- Upper B (Pull + Chest Secondary)
INSERT INTO templates (name, notes) VALUES ('Upper B', 'Pull primary + chest secondary');
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 1, 4, 6, 10 FROM templates t, exercises e WHERE t.name = 'Upper B' AND e.name = 'Barbell Bent Row';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 2, 3, 8, 12 FROM templates t, exercises e WHERE t.name = 'Upper B' AND e.name = 'Incline Barbell Bench';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 3, 3, 6, 10 FROM templates t, exercises e WHERE t.name = 'Upper B' AND e.name = 'Chin-ups';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 4, 3, 12, 20 FROM templates t, exercises e WHERE t.name = 'Upper B' AND e.name = 'Egyptian Raises';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 5, 3, 10, 15 FROM templates t, exercises e WHERE t.name = 'Upper B' AND e.name = 'Overhead DB Tricep Extension';

-- Lower B (Hinge Emphasis)
INSERT INTO templates (name, notes) VALUES ('Lower B', 'Hinge emphasis day');
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 1, 4, 6, 10 FROM templates t, exercises e WHERE t.name = 'Lower B' AND e.name = 'Romanian Deadlift';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 2, 3, 8, 12 FROM templates t, exercises e WHERE t.name = 'Lower B' AND e.name = 'Good Mornings';
INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max)
  SELECT t.id, e.id, 3, 3, 8, 15 FROM templates t, exercises e WHERE t.name = 'Lower B' AND e.name = 'Hanging Leg Raise';
