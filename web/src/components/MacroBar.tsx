interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}

export default function MacroBar({
  label,
  current,
  goal,
  color,
  unit = "g",
}: MacroBarProps) {
  const progress = Math.min(current / goal, 1);

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="text-sm text-text-secondary">
          {current}
          {unit} / {goal}
          {unit}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
