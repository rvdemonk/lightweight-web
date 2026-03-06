interface WorkoutProgressBarProps {
  completedSets: number;
  targetSets: number;
}

// S-curve ribbon: runs along bottom-left, angles up in the middle, continues along top-right
// Container is 20px tall, ribbon is ~8px thick
// Kink at golden ratio (~38.2% from left), parallel edges
const S_CURVE = `polygon(
  0% 55%,
  30% 55%,
  40% 0%,
  calc(100% - 6px) 0%,
  100% 45%,
  40% 45%,
  30% 100%,
  0% 100%
)`;

export function WorkoutProgressBar({ completedSets, targetSets }: WorkoutProgressBarProps) {
  if (targetSets <= 0) return null;

  const pct = Math.min(100, (completedSets / targetSets) * 100);

  return (
    <div style={{
      position: 'relative',
      height: 20,
      background: 'rgba(212, 118, 44, 0.06)',
      border: '1px solid rgba(212, 118, 44, 0.10)',
      borderRadius: 2,
      overflow: 'hidden',
      clipPath: S_CURVE,
    }}>
      {/* Clip container — width controls how much gradient is revealed */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: `${pct}%`,
        overflow: 'hidden',
        transition: 'width 0.4s ease',
        clipPath: 'polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
      }}>
        {/* Full-width gradient — always spans the entire bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: `${pct > 0 ? (100 / pct) * 100 : 100}%`,
          background: 'linear-gradient(to right, #b03030, #d4762c 30%, #d4a832 50%, #88c840 75%, #32e868)',
          boxShadow: '0 0 8px rgba(50, 232, 104, 0.3), 0 0 4px rgba(212, 118, 44, 0.4)',
        }} />
      </div>
    </div>
  );
}
