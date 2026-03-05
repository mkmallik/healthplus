import { Flame, Dumbbell, Footprints, Activity } from "lucide-react";
import { COLORS } from "@/lib/constants";
import type { CaloriesBurned } from "@/lib/types";

interface CaloriesBurnedCardProps {
  burned: CaloriesBurned;
  totalConsumed: number;
}

export default function CaloriesBurnedCard({ burned, totalConsumed }: CaloriesBurnedCardProps) {
  const net = totalConsumed - burned.total;

  return (
    <div className="rounded-xl bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4" style={{ color: COLORS.calories }} />
        <h3 className="text-sm font-semibold text-text">Calories Burned</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Activity className="h-3 w-3 text-text-secondary" />
          </div>
          <p className="text-lg font-bold text-text">{Math.round(burned.bmr)}</p>
          <p className="text-xs text-text-secondary">BMR</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Dumbbell className="h-3 w-3" style={{ color: COLORS.exercise }} />
          </div>
          <p className="text-lg font-bold" style={{ color: COLORS.exercise }}>{Math.round(burned.exercise)}</p>
          <p className="text-xs text-text-secondary">Exercise</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Footprints className="h-3 w-3" style={{ color: COLORS.steps }} />
          </div>
          <p className="text-lg font-bold" style={{ color: COLORS.steps }}>{Math.round(burned.steps)}</p>
          <p className="text-xs text-text-secondary">Steps</p>
        </div>
      </div>

      <div className="border-t border-border pt-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-text-secondary">Total Burned</p>
          <p className="text-base font-bold" style={{ color: COLORS.calories }}>{Math.round(burned.total)} kcal</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">Net Calories</p>
          <p className={`text-base font-bold ${net >= 0 ? "text-text" : "text-primary"}`}>
            {net >= 0 ? "+" : ""}{Math.round(net)} kcal
          </p>
        </div>
      </div>
    </div>
  );
}
