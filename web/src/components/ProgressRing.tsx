interface ProgressRingProps {
  current: number;
  goal: number;
  size?: number;
}

export default function ProgressRing({
  current,
  goal,
  size = 180,
}: ProgressRingProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / goal, 1);
  const offset = circumference * (1 - progress);
  const percentage = Math.round(progress * 100);
  const isOver = current > goal;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8E8E8"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOver ? "#F44336" : "#4CAF50"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-text">{current}</span>
        <span className="text-sm text-text-secondary">
          of {goal} kcal
        </span>
        <span className="text-xs text-text-secondary mt-0.5">
          {percentage}%
        </span>
      </div>
    </div>
  );
}
