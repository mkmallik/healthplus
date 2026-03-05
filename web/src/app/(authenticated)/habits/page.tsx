"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit3, Flame } from "lucide-react";
import api from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { formatDateISO, getDateLabel } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import DateNavigator from "@/components/DateNavigator";
import HabitModal from "@/components/HabitModal";
import type { HabitFormData } from "@/components/HabitModal";
import HabitIcon from "@/components/HabitIcon";
import type { HabitTodayItem, HabitStreakItem } from "@/lib/types";

export default function HabitsPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(new Date());
  const [habits, setHabits] = useState<HabitTodayItem[]>([]);
  const [streaks, setStreaks] = useState<HabitStreakItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<HabitTodayItem | null>(null);
  const [actionHabit, setActionHabit] = useState<HabitTodayItem | null>(null);
  const [descriptiveText, setDescriptiveText] = useState("");

  const dateStr = formatDateISO(date);

  const fetchData = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const [todayRes, streakRes] = await Promise.all([
        api.get(`/habits/today?date=${d}`),
        api.get("/habits/streaks").catch(() => ({ data: [] })),
      ]);
      setHabits(todayRes.data);
      setStreaks(streakRes.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateStr);
  }, [dateStr, fetchData]);

  const shiftDate = (days: number) => {
    setDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const handleToggleBoolean = async (item: HabitTodayItem) => {
    try {
      if (item.completed_today) {
        await api.delete(`/habits/${item.habit.id}/log?date=${dateStr}`);
        showToast("Log removed", "info");
      } else {
        await api.post(`/habits/${item.habit.id}/log?date=${dateStr}`);
        showToast("Marked complete!", "success");
      }
      fetchData(dateStr);
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
      fetchData(dateStr);
    } catch {
      showToast("Failed to log habit.", "error");
    }
  };

  const handleRemoveDescriptiveLog = async (item: HabitTodayItem) => {
    try {
      await api.delete(`/habits/${item.habit.id}/log?date=${dateStr}`);
      showToast("Log removed", "info");
      setActionHabit(null);
      fetchData(dateStr);
    } catch {
      showToast("Failed to remove log.", "error");
    }
  };

  const handleCreate = async (data: HabitFormData) => {
    try {
      await api.post("/habits", data);
      showToast("Habit created!", "success");
      setModalOpen(false);
      fetchData(dateStr);
    } catch {
      showToast("Failed to create habit.", "error");
    }
  };

  const handleEdit = async (data: HabitFormData) => {
    if (!editHabit) return;
    try {
      await api.put(`/habits/${editHabit.habit.id}`, data);
      showToast("Habit updated!", "success");
      setEditHabit(null);
      setModalOpen(false);
      fetchData(dateStr);
    } catch {
      showToast("Failed to update habit.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this habit?")) return;
    try {
      await api.delete(`/habits/${id}`);
      showToast("Habit deleted", "info");
      setActionHabit(null);
      fetchData(dateStr);
    } catch {
      showToast("Failed to delete habit.", "error");
    }
  };

  const completed = habits.filter((h) => h.completed_today).length;
  const total = habits.length;
  const progress = total > 0 ? completed / total : 0;

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <DateNavigator
        label={getDateLabel(date)}
        onPrev={() => shiftDate(-1)}
        onNext={() => shiftDate(1)}
        onReset={() => setDate(new Date())}
      />

      <h1 className="text-2xl font-bold text-text mb-4">Habits</h1>

      {/* Progress Card */}
      <div className="mb-4 rounded-xl bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-text">
            {completed} / {total} completed
          </span>
          <span className="text-sm font-medium text-text-secondary">
            {total > 0 ? Math.round(progress * 100) : 0}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Add Habit Button */}
      <button
        onClick={() => {
          setEditHabit(null);
          setModalOpen(true);
        }}
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
          const streak = streaks.find((s) => s.habit_id === h.id);
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
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: h.color + "20" }}
                >
                  <HabitIcon icon={h.icon} size={18} color={h.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text truncate">{h.name}</span>
                    {isDescriptive && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: h.color }}>
                        LOG
                      </span>
                    )}
                    {streak && streak.current_streak > 0 && (
                      <span className="flex items-center gap-0.5 text-xs" style={{ color: COLORS.streak }}>
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
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors"
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

              {/* Action Panel for descriptive habits */}
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
                      onClick={() => {
                        setEditHabit(item);
                        setModalOpen(true);
                      }}
                      className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {!h.is_default && (
                      <button
                        onClick={() => handleDelete(h.id)}
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

      {/* Streaks Section */}
      {streaks.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">Streaks</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {streaks.map((s) => {
              const active = s.current_streak > 0;
              return (
                <div
                  key={s.habit_id}
                  className={`flex-shrink-0 w-[110px] rounded-xl bg-surface p-3 shadow-sm text-center ${
                    active ? "border" : ""
                  }`}
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

      <HabitModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditHabit(null);
        }}
        onSave={editHabit ? handleEdit : handleCreate}
        editHabit={editHabit?.habit}
      />
    </div>
  );
}
