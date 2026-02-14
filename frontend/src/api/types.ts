export interface Exercise {
  id: number;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
}

export interface TemplateExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  position: number;
  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  rest_seconds: number | null;
  notes: string | null;
}

export interface Template {
  id: number;
  name: string;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  exercises: TemplateExercise[];
}

export interface WorkoutSet {
  id: number;
  session_exercise_id: number;
  set_number: number;
  weight_kg: number | null;
  reps: number;
  set_type: string;
  completed_at: string;
}

export interface SessionExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  position: number;
  notes: string | null;
  sets: WorkoutSet[];
}

export interface Session {
  id: number;
  template_id: number | null;
  template_name: string | null;
  name: string | null;
  started_at: string;
  ended_at: string | null;
  paused_duration: number;
  notes: string | null;
  status: string;
  exercises: SessionExercise[];
}

export interface SessionSummary {
  id: number;
  template_id: number | null;
  template_name: string | null;
  name: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
}

export interface ExerciseHistory {
  exercise_id: number;
  exercise_name: string;
  sessions: ExerciseHistoryEntry[];
}

export interface ExerciseHistoryEntry {
  session_id: number;
  session_name: string | null;
  date: string;
  sets: WorkoutSet[];
}
