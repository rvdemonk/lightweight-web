import { useState } from 'react';
import { IncrementButton } from './IncrementButton';

interface SetLoggerProps {
  defaultWeight: number | null;
  defaultReps: number;
  onLog: (weight: number | null, reps: number, rir: number | null) => void;
}

export function SetLogger({ defaultWeight, defaultReps, onLog }: SetLoggerProps) {
  const [weight, setWeight] = useState(defaultWeight ?? 0);
  const [reps, setReps] = useState(defaultReps);
  const [rir, setRir] = useState(0);
  const isBodyweight = defaultWeight === null && weight === 0;

  return (
    <div style={{ marginTop: 12 }}>
      <IncrementButton
        value={weight}
        onChange={setWeight}
        step={1.25}
        label="weight (kg)"
      />
      <div style={{ height: 8 }} />
      <IncrementButton
        value={reps}
        onChange={setReps}
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
