import type { ExercisePRData } from '../api/types';

export function calcE1rm(weightKg: number, reps: number, rir?: number | null): number {
  const effectiveReps = reps + (rir ?? 0);
  return weightKg * (1 + effectiveReps / 30);
}

export type PRBadge = 'absolute' | 'set' | null;

// --- Progression target calculator ---

export interface ProgressionTarget {
  weight: number;
  repsNeeded: number;       // reps to beat the target e1RM
  repsToMatch: number;      // reps to equal the target e1RM
  isCurrentWeight: boolean;
  isIncrement: boolean;     // true = one increment above current weight
}

export interface ProgressionOptions {
  targetE1rm: number;         // e1RM to beat
  currentWeight: number;      // last used weight
  increment?: number;         // weight step, default 2.5
  repRangeMin?: number;       // template min reps
  repRangeMax?: number;       // template max reps
  maxReps?: number;           // cap, default 30
  stepsBelow?: number;        // how many weight steps below current to show, default 1
  stepsAbove?: number;        // how many weight steps above current to show, default 3
}

export function progressionTargets(opts: ProgressionOptions): ProgressionTarget[] {
  const {
    targetE1rm,
    currentWeight,
    increment = 2.5,
    maxReps = 30,
    stepsBelow = 1,
    stepsAbove = 3,
  } = opts;

  if (targetE1rm <= 0 || currentWeight <= 0) return [];

  const results: ProgressionTarget[] = [];

  for (let step = -stepsBelow; step <= stepsAbove; step++) {
    const weight = currentWeight + step * increment;
    if (weight <= 0) continue;

    // reps to strictly beat: e1rm > targetE1rm
    // weight * (1 + reps/30) > targetE1rm
    // reps > (targetE1rm/weight - 1) * 30
    const exactRepsToBeat = (targetE1rm / weight - 1) * 30;
    const repsNeeded = Math.max(1, Math.ceil(exactRepsToBeat + 0.001)); // +epsilon to ensure strictly greater

    // reps to match (equal or exceed)
    const exactRepsToMatch = (targetE1rm / weight - 1) * 30;
    const repsToMatch = Math.max(1, Math.ceil(exactRepsToMatch));

    if (repsNeeded > maxReps) continue;

    results.push({
      weight,
      repsNeeded,
      repsToMatch,
      isCurrentWeight: step === 0,
      isIncrement: step === 1,
    });
  }

  return results;
}

// Convenience: get progression targets for a specific set position
export function setProgressionTargets(
  prData: ExercisePRData | undefined,
  setNumber: number,
  currentWeight: number,
  opts?: Partial<Omit<ProgressionOptions, 'targetE1rm' | 'currentWeight'>>,
): ProgressionTarget[] {
  if (!prData) return [];

  const targetE1rm = prData.best_e1rm_by_position[setNumber];
  if (targetE1rm === undefined) return []; // no history for this position

  return progressionTargets({ targetE1rm, currentWeight, ...opts });
}

// Convenience: get progression targets for absolute PR
export function absoluteProgressionTargets(
  prData: ExercisePRData | undefined,
  currentWeight: number,
  opts?: Partial<Omit<ProgressionOptions, 'targetE1rm' | 'currentWeight'>>,
): ProgressionTarget[] {
  if (!prData?.best_e1rm_ever) return [];

  return progressionTargets({ targetE1rm: prData.best_e1rm_ever, currentWeight, ...opts });
}

export function getPRBadge(
  set: { weight_kg: number | null; reps: number; rir?: number | null; set_number: number; set_type?: string },
  prData: ExercisePRData | undefined,
): PRBadge {
  if (!prData || !set.weight_kg || set.weight_kg <= 0 || set.reps <= 0) return null;
  if (set.set_type && set.set_type !== 'working') return null;

  const e1rm = calcE1rm(set.weight_kg, set.reps, set.rir);

  const isAbsolutePR = prData.best_e1rm_ever === null || e1rm > prData.best_e1rm_ever;
  if (isAbsolutePR) return 'absolute';

  const positionBest = prData.best_e1rm_by_position[set.set_number];
  const isSetPR = positionBest === undefined || e1rm > positionBest;
  if (isSetPR) return 'set';

  return null;
}
