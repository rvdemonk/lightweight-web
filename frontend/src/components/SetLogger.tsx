import { useState, useEffect } from 'react';
import { IncrementButton } from './IncrementButton';

interface SetLoggerProps {
  defaultWeight: number | null;
  defaultReps: number;
  onLog: (weight: number | null, reps: number, rir: number | null) => void;
  onWeightChange?: (weight: number) => void;
}

export function SetLogger({ defaultWeight, defaultReps, onLog, onWeightChange }: SetLoggerProps) {
  const [weight, setWeight] = useState(defaultWeight ?? 0);
  const [reps, setReps] = useState(defaultReps);
  const [rir, setRir] = useState<number | null>(null);
  const isBodyweight = defaultWeight === null && weight === 0;

  useEffect(() => {
    onWeightChange?.(weight);
  }, [weight]);

  return (
    <div style={{ marginTop: 12 }}>
      <IncrementButton
        value={weight}
        onChange={(v) => setWeight(v ?? 0)}
        step={1.25}
        label="weight (kg)"
        decimal
      />
      <div style={{ height: 8 }} />
      <IncrementButton
        value={reps}
        onChange={(v) => setReps(v ?? 1)}
        step={1}
        label="reps"
        min={1}
      />
      <div style={{ height: 8 }} />
      <IncrementButton
        value={rir}
        onChange={setRir}
        step={1}
        label="RIR"
        min={0}
        muted
        nullable
      />

      <div style={{ marginTop: 16 }}>
        <button
          className="btn btn-primary btn-full"
          onClick={() => onLog(isBodyweight ? null : weight, reps, rir)}
        >
          LOG SET
        </button>
      </div>
    </div>
  );
}
