// Cross-language conformance: run the shared vectors generated from
// crates/calc (the ground truth) against the TS implementation.
// Regenerate vectors: GEN_VECTORS=1 cargo test -p lightweight-calc vectors_match
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calcE1rm, getPRBadge, repsToBeat } from './e1rm';

interface Vectors {
  policy: string;
  tolerance: number;
  e1rm: { weight_kg: number; reps: number; expected: number }[];
  best: { sets: [number, number][]; expected: number | null }[];
  reps_to_beat: { target: number; weight_kg: number; expected: number | null }[];
}

const vectorsPath = fileURLToPath(
  new URL('../../../crates/calc/vectors/calc_vectors.json', import.meta.url),
);
const vectors: Vectors = JSON.parse(readFileSync(vectorsPath, 'utf-8'));

describe('shared calc vectors (ground truth: crates/calc)', () => {
  it('e1rm matches on raw reps', () => {
    for (const v of vectors.e1rm) {
      expect(
        Math.abs(calcE1rm(v.weight_kg, v.reps) - v.expected),
        `e1rm(${v.weight_kg}, ${v.reps})`,
      ).toBeLessThan(vectors.tolerance);
    }
  });

  it('best-of-sets matches (via calcE1rm composition)', () => {
    for (const v of vectors.best) {
      const computed = v.sets.length
        ? Math.max(...v.sets.map(([w, r]) => calcE1rm(w, r)))
        : null;
      if (v.expected === null) {
        expect(computed, 'empty sets').toBeNull();
      } else {
        expect(Math.abs((computed as number) - v.expected)).toBeLessThan(vectors.tolerance);
      }
    }
  });

  it('repsToBeat matches strict-beat semantics', () => {
    for (const v of vectors.reps_to_beat) {
      expect(
        repsToBeat(v.target, v.weight_kg),
        `repsToBeat(${v.target}, ${v.weight_kg})`,
      ).toBe(v.expected);
    }
  });
});

describe('getPRBadge calibration semantics (aligned with crates/calc detect_prs)', () => {
  const set = { weight_kg: 100, reps: 5, set_number: 1 };

  it('awards NO PR on empty history — first sessions calibrate', () => {
    expect(getPRBadge(set, { exercise_id: 1, best_e1rm_ever: null, best_e1rm_by_position: {} })).toBeNull();
  });

  it('awards absolute PR only when strictly beating prior best', () => {
    const prior = { exercise_id: 1, best_e1rm_ever: 116.0, best_e1rm_by_position: { 1: 116.0 } };
    expect(getPRBadge(set, prior)).toBe('absolute'); // 116.67 > 116
    const tied = { exercise_id: 1, best_e1rm_ever: calcE1rm(100, 5), best_e1rm_by_position: {} };
    expect(getPRBadge(set, tied)).toBeNull(); // tie is not a PR
  });

  it('awards set-position PR only against existing position history', () => {
    const prData = { exercise_id: 1, best_e1rm_ever: 200, best_e1rm_by_position: { 1: 110.0 } };
    expect(getPRBadge(set, prData)).toBe('set');
    const noPosition = { exercise_id: 1, best_e1rm_ever: 200, best_e1rm_by_position: {} };
    expect(getPRBadge(set, noPosition)).toBeNull();
  });
});
