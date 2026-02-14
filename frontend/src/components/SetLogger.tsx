import { useState } from 'react';
import { IncrementButton } from './IncrementButton';

interface SetLoggerProps {
  defaultWeight: number | null;
  defaultReps: number;
  onLog: (weight: number | null, reps: number) => void;
  onRepeatLast?: () => void;
  hasLastSet: boolean;
}

export function SetLogger({ defaultWeight, defaultReps, onLog, onRepeatLast, hasLastSet }: SetLoggerProps) {
  const [weight, setWeight] = useState(defaultWeight ?? 0);
  const [reps, setReps] = useState(defaultReps);
  const isBodyweight = defaultWeight === null && weight === 0;

  return (
    <div style={{ marginTop: 12 }}>
      <IncrementButton
        value={weight}
        onChange={setWeight}
        step={2.5}
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
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="btn btn-primary btn-full"
          onClick={() => onLog(isBodyweight ? null : weight, reps)}
        >
          LOG SET
        </button>
        {hasLastSet && onRepeatLast && (
          <button
            className="btn btn-secondary btn-full"
            onClick={onRepeatLast}
          >
            REPEAT LAST
          </button>
        )}
      </div>
    </div>
  );
}
