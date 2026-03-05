"use client";

import { useState, useEffect, useCallback } from "react";
import { Flame, Utensils, Dumbbell, Footprints, Scale } from "lucide-react";
import api from "@/lib/api";
import { COLORS } from "@/lib/constants";
import type { StreaksData, TrendsData, HabitStreakItem, CategoryStreak } from "@/lib/types";
import Spinner from "@/components/Spinner";
import TrendsChart from "@/components/TrendsChart";
import HabitIcon from "@/components/HabitIcon";

const STREAK_CATEGORIES: { key: keyof StreaksData; label: string; icon: typeof Flame }[] = [
  { key: "overall", label: "Overall", icon: Flame },
  { key: "food", label: "Food", icon: Utensils },
  { key: "exercise", label: "Exercise", icon: Dumbbell },
  { key: "steps", label: "Steps", icon: Footprints },
  { key: "body_metrics", label: "Metrics", icon: Scale },
];

const METRIC_OPTIONS = [
  { key: "calories", label: "Calories", color: COLORS.calories },
  { key: "steps", label: "Steps", color: COLORS.steps },
  { key: "exercise", label: "Exercise", color: COLORS.exercise },
  { key: "weight", label: "Weight", color: COLORS.weight },
];

const PERIOD_OPTIONS = [
  { key: "week", label: "7D" },
  { key: "month", label: "30D" },
  { key: "year", label: "1Y" },
];

export default function InsightsPage() {
  const [streaks, setStreaks] = useState<StreaksData | null>(null);
  const [habitStreaks, setHabitStreaks] = useState<HabitStreakItem[]>([]);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [metric, setMetric] = useState("calories");
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const fetchStreaks = useCallback(async () => {
    try {
      const [streakRes, habitRes] = await Promise.all([
        api.get("/stats/streaks"),
        api.get("/habits/streaks").catch(() => ({ data: [] })),
      ]);
      setStreaks(streakRes.data);
      setHabitStreaks(habitRes.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrends = useCallback(async (m: string, p: string) => {
    setTrendsLoading(true);
    try {
      const res = await api.get(`/stats/trends?metric=${m}&period=${p}`);
      setTrendsData(res.data);
    } catch {
      setTrendsData(null);
    } finally {
      setTrendsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  useEffect(() => {
    fetchTrends(metric, period);
  }, [metric, period, fetchTrends]);

  const metricConfig = METRIC_OPTIONS.find((m) => m.key === metric)!;

  // Calculate summary stats
  const nonZeroValues = trendsData?.data_points
    .map((d) => d.value)
    .filter((v): v is number => v !== null && v > 0) ?? [];
  const avg = nonZeroValues.length > 0
    ? Math.round(nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length)
    : 0;
  const highest = nonZeroValues.length > 0 ? Math.round(Math.max(...nonZeroValues)) : 0;
  const lowest = nonZeroValues.length > 0 ? Math.round(Math.min(...nonZeroValues)) : 0;

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl font-bold text-text mb-6">Insights</h1>

      {/* Category Streaks */}
      {streaks && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">Streaks</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STREAK_CATEGORIES.map(({ key, label, icon: Icon }) => {
              const s: CategoryStreak = streaks[key];
              const active = s.current_streak > 0;
              return (
                <div
                  key={key}
                  className={`flex-shrink-0 w-[110px] rounded-xl bg-surface p-3 shadow-sm text-center ${
                    active ? "border border-streak/30" : ""
                  }`}
                >
                  <Icon
                    className="h-5 w-5 mx-auto mb-1"
                    style={{ color: active ? COLORS.streak : COLORS.streakInactive }}
                  />
                  <p
                    className="text-2xl font-bold"
                    style={{ color: active ? COLORS.streak : COLORS.streakInactive }}
                  >
                    {s.current_streak}
                  </p>
                  <p className="text-xs text-text-secondary">day streak</p>
                  <p className="text-xs font-medium text-text mt-0.5">{label}</p>
                  <p className="text-[10px] text-text-secondary">{s.total_days} total days</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Habit Streaks */}
      {habitStreaks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">Habit Streaks</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {habitStreaks.map((h) => {
              const active = h.current_streak > 0;
              return (
                <div
                  key={h.habit_id}
                  className={`flex-shrink-0 w-[110px] rounded-xl bg-surface p-3 shadow-sm text-center ${
                    active ? "border" : ""
                  }`}
                  style={active ? { borderColor: h.color + "50" } : undefined}
                >
                  <div className="flex justify-center mb-1">
                    <HabitIcon icon={h.icon} size={20} color={active ? h.color : COLORS.streakInactive} />
                  </div>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: active ? h.color : COLORS.streakInactive }}
                  >
                    {h.current_streak}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {h.completed_today ? "done today" : "day streak"}
                  </p>
                  <p className="text-xs font-medium text-text mt-0.5 truncate">{h.name}</p>
                  <p className="text-[10px] text-text-secondary">Best: {h.longest_streak}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trends */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">Trends</h2>

        {/* Metric Selector */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {METRIC_OPTIONS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                metric === m.key
                  ? "text-white"
                  : "bg-surface border border-border text-text-secondary"
              }`}
              style={metric === m.key ? { backgroundColor: m.color } : undefined}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-4">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p.key
                  ? "bg-primary text-white"
                  : "bg-surface text-text-secondary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl bg-surface p-4 shadow-sm mb-4">
          {trendsLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <Spinner />
            </div>
          ) : trendsData && trendsData.data_points.length > 0 ? (
            <TrendsChart
              data={trendsData.data_points}
              metric={metric}
              period={period}
              color={metricConfig.color}
            />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-text-secondary">
              No data for this period
            </div>
          )}
        </div>

        {/* Summary */}
        {nonZeroValues.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Average", value: avg },
              { label: "Highest", value: highest },
              { label: "Lowest", value: lowest },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface p-3 shadow-sm text-center">
                <p className="text-lg font-bold" style={{ color: metricConfig.color }}>
                  {s.value.toLocaleString()}
                </p>
                <p className="text-xs text-text-secondary">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
