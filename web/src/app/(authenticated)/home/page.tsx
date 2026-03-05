"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Dumbbell, Footprints, Scale, Flame, Edit3, Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { COLORS, MEAL_ORDER, INTENSITY_COLORS } from "@/lib/constants";
import { formatDateISO, getDateLabel } from "@/lib/utils";
import type {
  DailySummary, StreaksData, HabitTodayItem, HabitStreakItem,
} from "@/lib/types";
import Spinner from "@/components/Spinner";
import ProgressRing from "@/components/ProgressRing";
import MacroBar from "@/components/MacroBar";
import MealSection from "@/components/MealSection";
import DateNavigator from "@/components/DateNavigator";
import ActivityCard from "@/components/ActivityCard";
import CaloriesBurnedCard from "@/components/CaloriesBurnedCard";
import HabitModal from "@/components/HabitModal";
import type { HabitFormData } from "@/components/HabitModal";
import HabitIcon from "@/components/HabitIcon";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth-context";

type SubTab = "food" | "habits" | "logs";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "food", label: "Food & Exercise" },
  { key: "habits", label: "Habits" },
  { key: "logs", label: "Logs" },
];

export default function HomePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [date, setDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<SubTab>("food");

  // Food & Exercise state
  const [data, setData] = useState<DailySummary | null>(null);
  const [streaks, setStreaks] = useState<StreaksData | null>(null);
  const [loading, setLoading] = useState(true);

  // Habits state
  const [habits, setHabits] = useState<HabitTodayItem[]>([]);
  const [habitStreaks, setHabitStreaks] = useState<HabitStreakItem[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<HabitTodayItem | null>(null);
  const [actionHabit, setActionHabit] = useState<HabitTodayItem | null>(null);
  const [descriptiveText, setDescriptiveText] = useState("");

  const dateStr = formatDateISO(date);
  const isToday = dateStr === formatDateISO(new Date());

  // Fetch daily data
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

  // Fetch streaks (once)
  const fetchStreaks = useCallback(async () => {
    try {
      const res = await api.get("/stats/streaks");
      setStreaks(res.data);
    } catch { /* silent */ }
  }, []);

  // Fetch habits for date
  const fetchHabits = useCallback(async (d: string) => {
    setHabitsLoading(true);
    try {
      const [todayRes, streakRes] = await Promise.all([
        api.get(`/habits/today?date=${d}`),
        api.get("/habits/streaks").catch(() => ({ data: [] })),
      ]);
      setHabits(todayRes.data);
      setHabitStreaks(streakRes.data);
    } catch { /* silent */ } finally {
      setHabitsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDaily(dateStr);
    fetchHabits(dateStr);
  }, [dateStr, fetchDaily, fetchHabits]);

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

  // Habit handlers
  const handleToggleBoolean = async (item: HabitTodayItem) => {
    try {
      if (item.completed_today) {
        await api.delete(`/habits/${item.habit.id}/log?date=${dateStr}`);
        showToast("Log removed", "info");
      } else {
        await api.post(`/habits/${item.habit.id}/log?date=${dateStr}`);
        showToast("Marked complete!", "success");
      }
      fetchHabits(dateStr);
    } catch {
      showToast("Failed to update habit.", "error");
    }
  };

  const handleLogDescriptive = async (item: HabitTodayItem) => {
    if (!descriptiveText.trim()) return;
    try {
      const formData = new FormData();
      formData.append("content", descriptiveText.trim());
      formData.append("log_date", dateStr);
      await api.post(`/habits/${item.habit.id}/log-descriptive`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("Habit logged!", "success");
      setDescriptiveText("");
      setActionHabit(null);
      fetchHabits(dateStr);
    } catch {
      showToast("Failed to log habit.", "error");
    }
  };

  const handleRemoveDescriptiveLog = async (item: HabitTodayItem) => {
    try {
      await api.delete(`/habits/${item.habit.id}/log?date=${dateStr}`);
      showToast("Log removed", "info");
      setActionHabit(null);
      fetchHabits(dateStr);
    } catch {
      showToast("Failed to remove log.", "error");
    }
  };

  const handleCreateHabit = async (formData: HabitFormData) => {
    try {
      await api.post("/habits", formData);
      showToast("Habit created!", "success");
      setModalOpen(false);
      fetchHabits(dateStr);
    } catch {
      showToast("Failed to create habit.", "error");
    }
  };

  const handleEditHabit = async (formData: HabitFormData) => {
    if (!editHabit) return;
    try {
      await api.put(`/habits/${editHabit.habit.id}`, formData);
      showToast("Habit updated!", "success");
      setEditHabit(null);
      setModalOpen(false);
      fetchHabits(dateStr);
    } catch {
      showToast("Failed to update habit.", "error");
    }
  };

  const handleDeleteHabit = async (id: number) => {
    if (!confirm("Delete this habit?")) return;
    try {
      await api.delete(`/habits/${id}`);
      showToast("Habit deleted", "info");
      setActionHabit(null);
      fetchHabits(dateStr);
    } catch {
      showToast("Failed to delete habit.", "error");
    }
  };

  const goal = data?.goal;
  const exerciseSummary = data?.exercise_summary;
  const stepSummary = data?.step_summary;
  const bodyMetrics = data?.body_metrics;
  const burned = data?.calories_burned;
  const latestWeight = bodyMetrics?.find((m) => m.metric_type === "weight");

  const habitsCompleted = habits.filter((h) => h.completed_today).length;
  const habitsTotal = habits.length;
  const habitsProgress = habitsTotal > 0 ? habitsCompleted / habitsTotal : 0;

  // Logs tab: only descriptive habits with logs
  const descriptiveHabits = habits.filter((h) => h.habit.habit_type === "descriptive");
  const loggedDescriptive = descriptiveHabits.filter((h) => h.completed_today && h.logs.length > 0);
  const unloggedDescriptive = descriptiveHabits.filter((h) => !h.completed_today);

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      {/* Date Navigator */}
      <DateNavigator
        label={getDateLabel(date)}
        onPrev={() => shiftDate(-1)}
        onNext={() => shiftDate(1)}
        onReset={() => setDate(new Date())}
      />

      {/* Sub-Tab Bar */}
      <div className="flex gap-1 mb-4 rounded-lg bg-gray-100 p-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== FOOD & EXERCISE TAB ========== */}
      {activeTab === "food" && (
        <>
          {/* Greeting (today only) */}
          {isToday && (
            <div className="mb-4">
              <h1 className="text-xl font-bold text-text">
                Hi, {user?.name?.split(" ")[0] || "there"} 👋
              </h1>
            </div>
          )}

          {/* Streak Banner (today only) */}
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
        </>
      )}

      {/* ========== HABITS TAB ========== */}
      {activeTab === "habits" && (
        <>
          {habitsLoading ? (
            <Spinner />
          ) : (
            <>
              {/* Progress Card */}
              <div className="mb-4 rounded-xl bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-text">
                    {habitsCompleted} / {habitsTotal} completed
                  </span>
                  <span className="text-sm font-medium text-text-secondary">
                    {habitsTotal > 0 ? Math.round(habitsProgress * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${habitsProgress * 100}%` }}
                  />
                </div>
              </div>

              {/* Add Habit Button */}
              <button
                onClick={() => { setEditHabit(null); setModalOpen(true); }}
                className="mb-4 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Habit
              </button>

              {/* Habit List */}
              <div className="space-y-2 mb-6">
                {habits.map((item) => {
                  const h = item.habit;
                  const isDescriptive = h.habit_type === "descriptive";
                  const streak = habitStreaks.find((s) => s.habit_id === h.id);
                  const latestLog = item.logs.length > 0 ? item.logs[item.logs.length - 1] : null;

                  return (
                    <div key={h.id}>
                      <button
                        onClick={() => {
                          if (isDescriptive) {
                            setActionHabit(actionHabit?.habit.id === h.id ? null : item);
                            setDescriptiveText("");
                          } else {
                            handleToggleBoolean(item);
                          }
                        }}
                        className="w-full flex items-center gap-3 rounded-xl bg-surface p-3 shadow-sm hover:shadow-md transition-shadow text-left"
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0"
                          style={{ backgroundColor: h.color + "20" }}
                        >
                          <HabitIcon icon={h.icon} size={18} color={h.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text truncate">{h.name}</span>
                            {isDescriptive && (
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: h.color }}>
                                LOG
                              </span>
                            )}
                            {streak && streak.current_streak > 0 && (
                              <span className="flex items-center gap-0.5 text-xs flex-shrink-0" style={{ color: COLORS.streak }}>
                                <Flame className="h-3 w-3" />
                                {streak.current_streak}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-secondary">
                            {h.frequency === "daily" ? "Every day" : `${h.frequency_target}x per ${h.frequency.replace("ly", "")}`}
                          </span>
                          {isDescriptive && latestLog?.content && (
                            <p className="text-xs text-text-secondary italic truncate mt-0.5">{latestLog.content}</p>
                          )}
                        </div>
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors flex-shrink-0"
                          style={{
                            borderColor: item.completed_today ? h.color : "#D0D0D0",
                            backgroundColor: item.completed_today ? h.color : "transparent",
                          }}
                        >
                          {item.completed_today && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Descriptive action panel */}
                      {actionHabit?.habit.id === h.id && isDescriptive && (
                        <div className="mt-1 rounded-xl bg-surface p-4 shadow-sm border border-border">
                          {item.completed_today && latestLog?.content && (
                            <div className="mb-3 p-2 rounded-lg bg-gray-50" style={{ borderLeft: `3px solid ${h.color}` }}>
                              <p className="text-xs text-text-secondary italic">{latestLog.content}</p>
                            </div>
                          )}
                          <textarea
                            value={descriptiveText}
                            onChange={(e) => setDescriptiveText(e.target.value)}
                            placeholder="What did you do?"
                            rows={2}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary resize-none mb-2"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleLogDescriptive(item)}
                              disabled={!descriptiveText.trim()}
                              className="flex-1 rounded-lg py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                              style={{ backgroundColor: h.color }}
                            >
                              Log
                            </button>
                            {item.completed_today && (
                              <button
                                onClick={() => handleRemoveDescriptiveLog(item)}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-error bg-red-50 hover:bg-red-100 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                            <button
                              onClick={() => { setEditHabit(item); setModalOpen(true); }}
                              className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {!h.is_default && (
                              <button
                                onClick={() => handleDeleteHabit(h.id)}
                                className="rounded-lg p-2 text-error hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Habit Streaks */}
              {habitStreaks.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">Streaks</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {habitStreaks.map((s) => {
                      const active = s.current_streak > 0;
                      return (
                        <div
                          key={s.habit_id}
                          className={`flex-shrink-0 w-[110px] rounded-xl bg-surface p-3 shadow-sm text-center ${active ? "border" : ""}`}
                          style={active ? { borderColor: s.color + "50" } : undefined}
                        >
                          <div className="flex justify-center mb-1">
                            <HabitIcon icon={s.icon} size={20} color={active ? s.color : COLORS.streakInactive} />
                          </div>
                          <p className="text-2xl font-bold" style={{ color: active ? s.color : COLORS.streakInactive }}>
                            {s.current_streak}
                          </p>
                          <p className="text-xs text-text-secondary">day streak</p>
                          <p className="text-xs font-medium text-text mt-0.5 truncate">{s.name}</p>
                          <p className="text-[10px] text-text-secondary">Best: {s.longest_streak}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <HabitModal
            open={modalOpen}
            onClose={() => { setModalOpen(false); setEditHabit(null); }}
            onSave={editHabit ? handleEditHabit : handleCreateHabit}
            editHabit={editHabit?.habit}
          />
        </>
      )}

      {/* ========== LOGS TAB ========== */}
      {activeTab === "logs" && (
        <>
          {habitsLoading ? (
            <Spinner />
          ) : (
            <>
              {/* Logged entries */}
              {loggedDescriptive.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">Journal Entries</h2>
                  <div className="space-y-3">
                    {loggedDescriptive.map((item) => {
                      const h = item.habit;
                      const latestLog = item.logs[item.logs.length - 1];
                      return (
                        <div
                          key={h.id}
                          className="rounded-xl bg-surface p-4 shadow-sm"
                          style={{ borderLeft: `4px solid ${h.color}` }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full"
                              style={{ backgroundColor: h.color + "20" }}
                            >
                              <HabitIcon icon={h.icon} size={14} color={h.color} />
                            </div>
                            <span className="text-sm font-semibold text-text">{h.name}</span>
                            {latestLog?.log_type && (
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-text-secondary">
                                {latestLog.log_type}
                              </span>
                            )}
                          </div>
                          {latestLog?.content && (
                            <p className="text-sm text-text-secondary">{latestLog.content}</p>
                          )}
                          {latestLog?.image_url && (
                            <img
                              src={`/uploads/${latestLog.image_url}`}
                              alt="Log"
                              className="mt-2 rounded-lg max-h-48 object-cover"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unlogged descriptive habits */}
              {unloggedDescriptive.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">Not Logged Yet</h2>
                  <div className="space-y-2">
                    {unloggedDescriptive.map((item) => {
                      const h = item.habit;
                      return (
                        <div
                          key={h.id}
                          className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-sm opacity-60"
                        >
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full"
                            style={{ backgroundColor: h.color + "20" }}
                          >
                            <HabitIcon icon={h.icon} size={16} color={h.color} />
                          </div>
                          <span className="flex-1 text-sm font-medium text-text">{h.name}</span>
                          <button
                            onClick={() => {
                              setActiveTab("habits");
                              setTimeout(() => setActionHabit(item), 100);
                            }}
                            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                            style={{ backgroundColor: h.color }}
                          >
                            Log
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {descriptiveHabits.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-text-secondary mb-2">No journal habits yet.</p>
                  <p className="text-xs text-text-secondary">
                    Create a descriptive habit to start journaling.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
