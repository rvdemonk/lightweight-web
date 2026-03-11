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
  rir: number | null;
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
  set_count: number;
  exercise_count: number;
  target_set_count: number | null;
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

export interface DayActivity {
  date: string;
  set_count: number;
}

export interface DayTemplateActivity {
  date: string;
  template_id: number | null;
  template_name: string | null;
  set_count: number;
}

export interface DayPR {
  date: string;
  has_absolute_pr: boolean;
  has_set_pr: boolean;
}

export interface E1rmDataPoint {
  date: string;
  e1rm: number;
  weight_kg: number;
  reps: number;
  rir: number | null;
}

export interface PersonalRecord {
  value: number;
  date: string;
  detail: string;
}

export interface ExercisePRs {
  best_e1rm: PersonalRecord | null;
  heaviest_weight: PersonalRecord | null;
  most_reps: PersonalRecord | null;
}

export interface ExerciseE1rm {
  exercise_id: number;
  exercise_name: string;
  data: E1rmDataPoint[];
  prs: ExercisePRs;
}

export interface ExerciseSummary {
  id: number;
  name: string;
  muscle_group: string | null;
  session_count: number;
}

export interface WeeklyVolume {
  week: string;
  muscle_group: string;
  set_count: number;
}

export interface WeeklyFrequency {
  week: string;
  session_count: number;
}

export interface E1rmSpiderPoint {
  exercise_id: number;
  exercise_name: string;
  pct_change: number | null;
  current_e1rm: number | null;
  previous_e1rm: number | null;
}

export interface E1rmSpiderPrefs {
  exercise_ids: number[];
}

export interface E1rmMover {
  exercise_id: number;
  exercise_name: string;
  muscle_group: string | null;
  current_e1rm: number;
  previous_e1rm: number;
  pct_change: number;
}

export interface StaleExercise {
  exercise_id: number;
  exercise_name: string;
  muscle_group: string | null;
  last_performed: string;
  days_ago: number;
  total_sets: number;
}

export interface ExercisePRData {
  exercise_id: number;
  best_e1rm_ever: number | null;
  best_e1rm_by_position: Record<number, number>;
}

export interface ExportMeta {
  session_count: number;
  set_count: number;
  first_session: string | null;
  last_session: string | null;
}
