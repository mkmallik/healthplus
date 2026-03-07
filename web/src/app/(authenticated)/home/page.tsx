"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Dumbbell, Footprints, Scale, Flame,
} from "lucide-react";
import api from "@/lib/api";
import { COLORS, MEAL_ORDER, INTENSITY_COLORS } from "@/lib/constants";
import { formatDateISO, getDateLabel } from "@/lib/utils";
import type { DailySummary, StreaksData } from "@/lib/types";
import Spinner from "@/components/Spinner";
import ProgressRing from "@/components/ProgressRing";
import MacroBar from "@/components/MacroBar";
import MealSection from "@/components/MealSection";
import DateNavigator from "@/components/DateNavigator";
import ActivityCard from "@/components/ActivityCard";
import CaloriesBurnedCard from "@/components/CaloriesBurnedCard";

export default function HomePage() {
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<DailySummary | null>(null);
  const [streaks, setStreaks] = useState<StreaksData | null>(null);
  const [loading, setLoading] = useState(true);

  const dateStr = formatDateISO(date);
  const isToday = dateStr === formatDateISO(new Date());

  const fetchDaily = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/daily?date=${d}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStreaks = useCallback(async () => {
    try {
      const res = await api.get("/stats/streaks");
      setStreaks(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchDaily(dateStr);
  }, [dateStr, fetchDaily]);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  const shiftDate = (days: number) => {
    setDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const goal = data?.goal;
  const exerciseSummary = data?.exercise_summary;
  const stepSummary = data?.step_summary;
  const bodyMetrics = data?.body_metrics;
  const burned = data?.calories_burned;
  const latestWeight = bodyMetrics?.find((m) => m.metric_type === "weight");

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <DateNavigator
        label={getDateLabel(date)}
        onPrev={() => shiftDate(-1)}
        onNext={() => shiftDate(1)}
        onReset={() => setDate(new Date())}
        onDateSelect={(d) => setDate(d)}
        selectedDate={date}
      />

      {/* Streak Banner */}
      {isToday && streaks && streaks.overall.current_streak > 0 && (
        <Link
          href="/insights"
          className="mb-4 flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-2.5 transition-colors hover:bg-orange-100"
        >
          <span className="text-lg">🔥</span>
          <span className="text-sm font-semibold" style={{ color: COLORS.streak }}>
            {streaks.overall.current_streak} day streak!
          </span>
        </Link>
      )}

      {loading && <Spinner />}

      {!loading && data && (
        <>
          {!goal && (
            <div className="mb-4 rounded-lg border-l-4 border-accent bg-orange-50 p-4">
              <p className="text-sm text-text">
                Set your{" "}
                <Link href="/goals" className="font-medium text-primary underline">
                  daily goals
                </Link>{" "}
                to track progress.
              </p>
            </div>
          )}

          <div className="mb-4 flex justify-center">
            <ProgressRing
              current={Math.round(data.total_calories)}
              goal={goal?.daily_calories ?? 2000}
            />
          </div>

          <div className="mb-4 rounded-xl bg-surface p-4 shadow-sm">
            <MacroBar label="Protein" current={Math.round(data.total_protein)} goal={goal?.daily_protein ?? 50} color={COLORS.protein} />
            <MacroBar label="Carbs" current={Math.round(data.total_carbs)} goal={goal?.daily_carbs ?? 250} color={COLORS.carbs} />
            <MacroBar label="Fat" current={Math.round(data.total_fat)} goal={goal?.daily_fat ?? 65} color={COLORS.fat} />
          </div>

          {/* Activity Row */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <ActivityCard
              icon={Dumbbell}
              value={exerciseSummary ? `${exerciseSummary.total_duration_minutes} min` : "0 min"}
              label="Exercise"
              color={COLORS.exercise}
              subtitle={exerciseSummary ? `${Math.round(exerciseSummary.total_calories_burned)} kcal` : undefined}
            />
            <ActivityCard
              icon={Footprints}
              value={stepSummary ? stepSummary.total_steps.toLocaleString() : "0"}
              label="Steps"
              color={COLORS.steps}
              progress={goal?.daily_steps ? (stepSummary?.total_steps ?? 0) / goal.daily_steps : undefined}
              subtitle={goal?.daily_steps ? `/ ${goal.daily_steps.toLocaleString()}` : undefined}
            />
            <ActivityCard
              icon={Scale}
              value={latestWeight ? `${latestWeight.value}` : "—"}
              label="Weight"
              color={COLORS.weight}
              subtitle={latestWeight?.unit}
            />
          </div>

          {burned && burned.total > 0 && (
            <div className="mb-4">
              <CaloriesBurnedCard burned={burned} totalConsumed={data.total_calories} />
            </div>
          )}

          {exerciseSummary && exerciseSummary.exercises.length > 0 && (
            <div className="mb-4 rounded-xl bg-surface p-4 shadow-sm" style={{ borderLeft: `4px solid ${COLORS.exercise}` }}>
              <h3 className="text-sm font-semibold text-text mb-3">Exercises</h3>
              {exerciseSummary.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: INTENSITY_COLORS[ex.intensity] || COLORS.exercise }}
                    >
                      {ex.exercise_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm text-text-secondary">{ex.duration_minutes} min</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: COLORS.exercise }}>
                    {Math.round(ex.calories_burned)} kcal
                  </span>
                </div>
              ))}
            </div>
          )}

          {data.total_calories > 0 && goal && (
            <div className="mb-4 rounded-xl bg-surface p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-text mb-3">Nutrition Summary</h3>
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                <div>
                  <p className="text-base font-bold" style={{ color: COLORS.calories }}>{Math.round(data.total_calories)}</p>
                  <p className="text-xs text-text-secondary">kcal</p>
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: COLORS.protein }}>{Math.round(data.total_protein)}g</p>
                  <p className="text-xs text-text-secondary">Protein</p>
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: COLORS.carbs }}>{Math.round(data.total_carbs)}g</p>
                  <p className="text-xs text-text-secondary">Carbs</p>
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: COLORS.fat }}>{Math.round(data.total_fat)}g</p>
                  <p className="text-xs text-text-secondary">Fat</p>
                </div>
              </div>
              <p className="text-xs text-text-secondary text-center">
                {Math.round((data.total_calories / (goal.daily_calories || 2000)) * 100)}% of daily calorie goal
                {burned && burned.total > 0 && (
                  <> &middot; Net: {Math.round(data.total_calories - burned.total)} kcal</>
                )}
              </p>
            </div>
          )}

          <div className="mb-4">
            {MEAL_ORDER.map((mealKey) => {
              const meal = data.meals.find((m) => m.meal_type === mealKey);
              return (
                <MealSection
                  key={mealKey}
                  mealType={mealKey}
                  foods={meal?.foods ?? []}
                  totalCalories={meal?.total_calories ?? 0}
                />
              );
            })}
          </div>
        </>
      )}

      <Link
        href="/log"
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark transition-colors z-40"
      >
        <Plus className="h-7 w-7" />
      </Link>
    </div>
  );
}
