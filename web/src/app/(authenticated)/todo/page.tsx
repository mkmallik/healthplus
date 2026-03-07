"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckSquare, Plus, Archive, Trash2, RotateCcw } from "lucide-react";
import api from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { formatDateISO, getDateLabel } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import DateNavigator from "@/components/DateNavigator";
import HabitIcon from "@/components/HabitIcon";
import type { HabitTodayItem, TodoItemResponse, TodoSummary } from "@/lib/types";

interface TodoHabitData {
  habit: HabitTodayItem["habit"];
  summary: TodoSummary;
}

export default function TodoPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(new Date());
  const [todoHabits, setTodoHabits] = useState<TodoHabitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemTexts, setNewItemTexts] = useState<Record<number, string>>({});
  const [contextMenu, setContextMenu] = useState<{
    item: TodoItemResponse;
    habitId: number;
    x: number;
    y: number;
  } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  const dateStr = formatDateISO(date);

  const fetchData = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/habits/today?date=${d}`);
      const allHabits: HabitTodayItem[] = res.data;
      const todos = allHabits.filter((h) => h.habit.habit_type === "todo");

      const summaries = await Promise.all(
        todos.map((t) =>
          api.get(`/habits/${t.habit.id}/todos?date=${d}`).then((r) => r.data as TodoSummary)
        )
      );

      setTodoHabits(
        todos.map((t, i) => ({
          habit: t.habit,
          summary: summaries[i],
        }))
      );
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateStr);
  }, [dateStr, fetchData]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  const shiftDate = (days: number) => {
    setDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const handleToggleItem = async (habitId: number, item: TodoItemResponse) => {
    try {
      await api.patch(`/habits/${habitId}/todos/${item.id}?date=${dateStr}`, {
        is_done: !item.is_done,
      });
      fetchData(dateStr);
    } catch {
      showToast("Failed to update item.", "error");
    }
  };

  const handleAddItem = async (habitId: number) => {
    const text = (newItemTexts[habitId] || "").trim();
    if (!text) return;
    try {
      await api.post(`/habits/${habitId}/todos`, { text });
      setNewItemTexts((prev) => ({ ...prev, [habitId]: "" }));
      showToast("Item added!", "success");
      fetchData(dateStr);
    } catch {
      showToast("Failed to add item.", "error");
    }
  };

  const handleArchiveItem = async (habitId: number, itemId: number) => {
    try {
      await api.patch(`/habits/${habitId}/todos/${itemId}/archive`);
      showToast("Item archived", "info");
      setContextMenu(null);
      fetchData(dateStr);
    } catch {
      showToast("Failed to archive item.", "error");
    }
  };

  const handleDeleteItem = async (habitId: number, itemId: number) => {
    try {
      await api.delete(`/habits/${habitId}/todos/${itemId}`);
      showToast("Item deleted", "info");
      setContextMenu(null);
      fetchData(dateStr);
    } catch {
      showToast("Failed to delete item.", "error");
    }
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    item: TodoItemResponse,
    habitId: number
  ) => {
    e.preventDefault();
    setContextMenu({ item, habitId, x: e.clientX, y: e.clientY });
  };

  if (loading) return <Spinner />;

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

      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-text">Todo</h1>
      </div>

      {todoHabits.length === 0 && (
        <div className="rounded-xl bg-surface p-8 shadow-sm text-center">
          <CheckSquare className="h-12 w-12 text-text-secondary mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-secondary">
            No todo habits found. Create a habit with type &quot;Todo&quot; on the Habits page.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {todoHabits.map(({ habit, summary }) => {
          const progress = summary.total > 0 ? summary.done / summary.total : 0;
          const allDone = summary.total > 0 && summary.done === summary.total;

          return (
            <div key={habit.id} className="rounded-xl bg-surface p-4 shadow-sm">
              {/* Habit Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: habit.color + "20" }}
                >
                  <HabitIcon icon={habit.icon} size={18} color={habit.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-text truncate block">
                    {habit.name}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {summary.done} / {summary.total} done
                  </span>
                </div>
                {allDone && summary.total > 0 && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: habit.color }}
                  >
                    Done
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {summary.total > 0 && (
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress * 100}%`,
                      backgroundColor: habit.color,
                    }}
                  />
                </div>
              )}

              {/* Todo Items */}
              <div className="space-y-1">
                {summary.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors group"
                    onContextMenu={(e) => handleContextMenu(e, item, habit.id)}
                  >
                    {/* Custom Checkbox */}
                    <button
                      onClick={() => handleToggleItem(habit.id, item)}
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors"
                      style={{
                        borderColor: item.is_done ? habit.color : "#D0D0D0",
                        backgroundColor: item.is_done ? habit.color : "transparent",
                      }}
                    >
                      {item.is_done && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Item Text */}
                    <span
                      className={`flex-1 text-sm ${
                        item.is_done
                          ? "line-through text-text-secondary"
                          : "text-text"
                      }`}
                    >
                      {item.text}
                    </span>

                    {/* Carried Over Badge */}
                    {item.is_carried_over && (
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: COLORS.accent }}>
                        <RotateCcw className="h-2.5 w-2.5" />
                        carried over
                      </span>
                    )}

                    {/* Hover actions */}
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={() => handleArchiveItem(habit.id, item.id)}
                        className="rounded p-1 text-text-secondary hover:bg-gray-200 transition-colors"
                        title="Archive"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(habit.id, item.id)}
                        className="rounded p-1 text-text-secondary hover:bg-red-50 hover:text-error transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Item Input */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <input
                  type="text"
                  value={newItemTexts[habit.id] || ""}
                  onChange={(e) =>
                    setNewItemTexts((prev) => ({
                      ...prev,
                      [habit.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddItem(habit.id);
                    }
                  }}
                  placeholder="Add a new item..."
                  className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary placeholder:text-text-secondary"
                />
                <button
                  onClick={() => handleAddItem(habit.id)}
                  disabled={!(newItemTexts[habit.id] || "").trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="fixed z-50 min-w-[160px] rounded-lg bg-surface shadow-lg border border-border py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() =>
              handleArchiveItem(contextMenu.habitId, contextMenu.item.id)
            }
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-gray-50 transition-colors"
          >
            <Archive className="h-4 w-4 text-text-secondary" />
            Archive
          </button>
          <button
            onClick={() =>
              handleDeleteItem(contextMenu.habitId, contextMenu.item.id)
            }
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
