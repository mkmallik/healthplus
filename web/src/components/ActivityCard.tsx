import type { LucideIcon } from "lucide-react";

interface ActivityCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  color: string;
  progress?: number; // 0-1
  subtitle?: string;
}

export default function ActivityCard({ icon: Icon, value, label, color, progress, subtitle }: ActivityCardProps) {
  return (
    <div className="rounded-xl bg-surface p-3 shadow-sm" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-xs font-medium text-text-secondary">{label}</span>
      </div>
      <p className="text-lg font-bold text-text">{value}</p>
      {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
      {progress !== undefined && (
        <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
}
