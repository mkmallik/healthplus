"use client";

import { useState, useEffect, useCallback } from "react";
import { Dumbbell, Footprints, Scale } from "lucide-react";
import api from "@/lib/api";
import { COLORS, MEAL_LABELS, MEAL_ORDER, INTENSITY_COLORS, METRIC_LABELS, METRIC_COLORS } from "@/lib/constants";
import {
  formatDateISO,
  formatShortDate,
  formatMonthYear,
  formatWeekRange,
  formatDayLabel,
} from "@/lib/utils";
import type { DailySummary, WeeklySummary, MonthlySummary } from "@/lib/types";
import Spinner from "@/components/Spinner";
import TabBar from "@/components/TabBar";
import DateNavigator from "@/components/DateNavigator";
import ProgressRing from "@/components/ProgressRing";
import MacroBar from "@/components/MacroBar";
import WeeklyChart from "@/components/WeeklyChart";
import CaloriesBurnedCard from "@/components/CaloriesBurnedCard";

type TabKey = "daily" | "weekly" | "monthly";

const TABS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("daily");

  const [dailyDate, setDailyDate] = useState(new Date());
  const [dailyData, setDailyData] = useState<DailySummary | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  const [weeklyDate, setWeeklyDate] = useState(new Date());
  const [weeklyData, setWeeklyData] = useState<WeeklySummary | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const [monthlyDate, setMonthlyDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlySummary | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const fetchDaily = useCallback(async (date: Date) => {
    setDailyLoading(true);
    try {
      const res = await api.get(`/dashboard/daily?date=${formatDateISO(date)}`);
      setDailyData(res.data);
    } catch {
      setDailyData(null);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  const fetchWeekly = useCallback(async (date: Date) => {
    setWeeklyLoading(true);
    try {
      const res = await api.get(`/dashboard/weekly?date=${formatDateISO(date)}`);
      setWeeklyData(res.data);
    } catch {
      setWeeklyData(null);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  const fetchMonthly = useCallback(async (date: Date) => {
    setMonthlyLoading(true);
    try {
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      const res = await api.get(`/dashboard/monthly?year=${y}&month=${m}`);
      setMonthlyData(res.data);
    } catch {
      setMonthlyData(null);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "daily") fetchDaily(dailyDate);
  }, [activeTab, dailyDate, fetchDaily]);

  useEffect(() => {
    if (activeTab === "weekly") fetchWeekly(weeklyDate);
  }, [activeTab, weeklyDate, fetchWeekly]);

  useEffect(() => {
    if (activeTab === "monthly") fetchMonthly(monthlyDate);
  }, [activeTab, monthlyDate, fetchMonthly]);

  const shiftDailyDate = (days: number) => {
    setDailyDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const shiftWeeklyDate = (days: number) => {
    setWeeklyDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const shiftMonthlyDate = (months: number) => {
    setMonthlyDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + months);
      return next;
    });
  };

  const renderDaily = () => {
    if (dailyLoading) return <Spinner />;
    if (!dailyData) {
      return <p className="py-12 text-center text-sm text-text-secondary">No data for this day.</p>;
    }

    const goal = dailyData.goal;
    const sortedMeals = [...(dailyData.meals || [])].sort(
      (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
    );
    const exerciseSummary = dailyData.exercise_summary;
    const stepSummary = dailyData.step_summary;
    const bodyMetrics = dailyData.body_metrics;
    const burned = dailyData.calories_burned;

    return (
      <>
        <div className="mb-4 flex justify-center relative">
          <ProgressRing
            current={Math.round(dailyData.total_calories)}
            goal={goal?.daily_calories ?? 2000}
          />
        </div>

        <div className="rounded-xl bg-surface p-4 shadow-sm mb-4">
          <MacroBar label="Protein" current={Math.round(dailyData.total_protein)} goal={goal?.daily_protein ?? 50} color={COLORS.protein} />
          <MacroBar label="Carbs" current={Math.round(dailyData.total_carbs)} goal={goal?.daily_carbs ?? 250} color={COLORS.carbs} />
          <MacroBar label="Fat" current={Math.round(dailyData.total_fat)} goal={goal?.daily_fat ?? 65} color={COLORS.fat} />
        </div>

        {/* Calories Burned */}
        {burned && burned.total > 0 && (
          <div className="mb-4">
            <CaloriesBurnedCard burned={burned} totalConsumed={dailyData.total_calories} />
          </div>
        )}

        {/* Exercise Summary */}
        {exerciseSummary && exerciseSummary.total_exercises > 0 && (
          <div className="rounded-xl bg-surface p-4 shadow-sm mb-4" style={{ borderLeft: `4px solid ${COLORS.exercise}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="h-4 w-4" style={{ color: COLORS.exercise }} />
              <h3 className="text-sm font-semibold text-text">
                Exercise — {exerciseSummary.total_duration_minutes} min, {Math.round(exerciseSummary.total_calories_burned)} kcal
              </h3>
            </div>
            {exerciseSummary.exercises.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: INTENSITY_COLORS[ex.intensity] || COLORS.exercise }}
                  >
                    {ex.exercise_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-text-secondary">{ex.duration_minutes} min</span>
                </div>
                <span className="text-xs font-medium" style={{ color: COLORS.exercise }}>
                  {Math.round(ex.calories_burned)} kcal
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Steps */}
        {stepSummary && stepSummary.total_steps > 0 && (
          <div className="rounded-xl bg-surface p-4 shadow-sm mb-4" style={{ borderLeft: `4px solid ${COLORS.steps}` }}>
            <div className="flex items-center gap-2">
              <Footprints className="h-4 w-4" style={{ color: COLORS.steps }} />
              <h3 className="text-sm font-semibold text-text">Steps</h3>
              <span className="ml-auto text-lg font-bold" style={{ color: COLORS.steps }}>
                {stepSummary.total_steps.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Body Metrics */}
        {bodyMetrics && bodyMetrics.length > 0 && (
          <div className="rounded-xl bg-surface p-4 shadow-sm mb-4" style={{ borderLeft: `4px solid ${COLORS.weight}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-4 w-4" style={{ color: COLORS.weight }} />
              <h3 className="text-sm font-semibold text-text">Body Metrics</h3>
            </div>
            <div className="flex gap-4">
              {bodyMetrics.map((m) => (
                <div key={m.id} className="text-center">
                  <p className="text-lg font-bold" style={{ color: METRIC_COLORS[m.metric_type] || COLORS.weight }}>
                    {m.value} <span className="text-xs font-normal text-text-secondary">{m.unit}</span>
                  </p>
                  <p className="text-xs text-text-secondary">{METRIC_LABELS[m.metric_type] || m.metric_type}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meals */}
        {sortedMeals.map((meal) => (
          <div key={meal.meal_type} className="rounded-xl bg-surface p-4 shadow-sm mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: COLORS[meal.meal_type as keyof typeof COLORS] || COLORS.primary,
                }}
              />
              <span className="flex-1 text-sm font-semibold text-text">
                {MEAL_LABELS[meal.meal_type] || meal.meal_type}
              </span>
              <span className="text-sm text-text-secondary">
                {Math.round(meal.total_calories)} kcal
              </span>
            </div>
            {meal.foods.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-1.5 pl-5 border-t border-border">
                <span className="text-sm text-text truncate flex-1 mr-2">{item.description}</span>
                <span className="text-xs text-text-secondary">{Math.round(item.calories)} kcal</span>
              </div>
            ))}
          </div>
        ))}
      </>
    );
  };

  const renderWeekly = () => {
    if (weeklyLoading) return <Spinner />;
    if (!weeklyData) {
      return <p className="py-12 text-center text-sm text-text-secondary">No data for this week.</p>;
    }

    const chartDays = weeklyData.days.map((d) => ({
      date: d.date,
      calories: d.total_calories,
    }));
    const goalCal = weeklyData.days.find((d) => d.goal)?.goal?.daily_calories ?? 2000;

    return (
      <>
        <div className="rounded-xl bg-surface p-4 shadow-sm mb-4">
          <WeeklyChart days={chartDays} goal={goalCal} />
        </div>

        <div className="rounded-xl bg-surface p-4 shadow-sm">
          <h3 className="text-sm font-bold text-text mb-3">Weekly Averages</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Avg Calories", value: weeklyData.avg_calories, color: COLORS.calories, unit: "" },
              { label: "Avg Protein", value: weeklyData.avg_protein, color: COLORS.protein, unit: "g" },
              { label: "Avg Carbs", value: weeklyData.avg_carbs, color: COLORS.carbs, unit: "g" },
              { label: "Avg Fat", value: weeklyData.avg_fat, color: COLORS.fat, unit: "g" },
            ].map((stat) => (
              <div key={stat.label} className="text-center py-2">
                <p className="text-xl font-bold" style={{ color: stat.color }}>
                  {Math.round(stat.value)}{stat.unit}
                </p>
                <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const renderMonthly = () => {
    if (monthlyLoading) return <Spinner />;
    if (!monthlyData) {
      return <p className="py-12 text-center text-sm text-text-secondary">No data for this month.</p>;
    }

    const daysWithData = monthlyData.days.filter((d) => d.total_calories > 0);

    return (
      <>
        <div className="rounded-xl bg-surface p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-text mb-3">Monthly Averages</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Avg Calories", value: monthlyData.avg_calories, color: COLORS.calories, unit: "" },
              { label: "Avg Protein", value: monthlyData.avg_protein, color: COLORS.protein, unit: "g" },
              { label: "Avg Carbs", value: monthlyData.avg_carbs, color: COLORS.carbs, unit: "g" },
              { label: "Avg Fat", value: monthlyData.avg_fat, color: COLORS.fat, unit: "g" },
            ].map((stat) => (
              <div key={stat.label} className="text-center py-2">
                <p className="text-xl font-bold" style={{ color: stat.color }}>
                  {Math.round(stat.value)}{stat.unit}
                </p>
                <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-surface p-4 shadow-sm">
          <h3 className="text-sm font-bold text-text mb-3">Daily Breakdown</h3>
          {daysWithData.length === 0 && (
            <p className="text-sm text-text-secondary text-center py-4">No entries this month.</p>
          )}
          {daysWithData.map((day) => (
            <div key={day.date} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
              <span className="text-sm font-medium text-text">{formatDayLabel(day.date)}</span>
              <span className="text-sm text-text-secondary">{Math.round(day.total_calories)} kcal</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  const weeklyLabel = weeklyData
    ? formatWeekRange(weeklyData.start_date, weeklyData.end_date)
    : "Select Week";

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <TabBar tabs={TABS} active={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />

      {activeTab === "daily" && (
        <DateNavigator
          label={formatShortDate(dailyDate)}
          onPrev={() => shiftDailyDate(-1)}
          onNext={() => shiftDailyDate(1)}
          onDateSelect={(d) => setDailyDate(d)}
          selectedDate={dailyDate}
        />
      )}
      {activeTab === "weekly" && (
        <DateNavigator
          label={weeklyLabel}
          onPrev={() => shiftWeeklyDate(-7)}
          onNext={() => shiftWeeklyDate(7)}
        />
      )}
      {activeTab === "monthly" && (
        <DateNavigator
          label={formatMonthYear(monthlyDate)}
          onPrev={() => shiftMonthlyDate(-1)}
          onNext={() => shiftMonthlyDate(1)}
        />
      )}

      {activeTab === "daily" && renderDaily()}
      {activeTab === "weekly" && renderWeekly()}
      {activeTab === "monthly" && renderMonthly()}
    </div>
  );
}
