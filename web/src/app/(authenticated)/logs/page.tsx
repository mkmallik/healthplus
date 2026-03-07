"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, FileText, Mic, Camera, CheckCircle, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { formatDateISO, getDateLabel } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";
import DateNavigator from "@/components/DateNavigator";
import HabitIcon from "@/components/HabitIcon";
import type { Habit, HabitLog, HabitTodayItem } from "@/lib/types";

interface HabitLogDateGroup {
  date: string;
  entries: { habit: Habit; log: HabitLog }[];
  unlogged: Habit[];
}

type Period = "day" | "7days" | "30days" | "all";
const PAGE_SIZE = 20;

const LOG_TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; bg: string; fg: string }> = {
  text: { label: "Text", icon: FileText, bg: "#E3F2FD", fg: "#1565C0" },
  voice: { label: "Voice", icon: Mic, bg: "#F3E5F5", fg: "#7B1FA2" },
  image: { label: "Image", icon: Camera, bg: "#E8F5E9", fg: "#2E7D32" },
  manual: { label: "Manual", icon: CheckCircle, bg: "#FFF3E0", fg: "#E65100" },
};

function formatSectionDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const todayISO = formatDateISO(today);
  if (dateStr === todayISO) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === formatDateISO(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function LogsPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(new Date());
  const [period, setPeriod] = useState<Period>("day");
  const [loading, setLoading] = useState(true);

  // Day mode state
  const [dayItems, setDayItems] = useState<HabitTodayItem[]>([]);

  // Multi-day / all mode state
  const [groups, setGroups] = useState<HabitLogDateGroup[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Inline log form
  const [expandedHabitId, setExpandedHabitId] = useState<number | null>(null);
  const [logText, setLogText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dateStr = formatDateISO(date);

  const fetchDayData = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/habits/today?date=${d}`);
      const all: HabitTodayItem[] = res.data;
      // Only show descriptive habits
      setDayItems(all.filter((item) => item.habit.habit_type === "descriptive"));
    } catch {
      showToast("Failed to load logs.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchRangeData = useCallback(async (d: Date, p: Period) => {
    setLoading(true);
    setOffset(0);
    try {
      let url: string;
      if (p === "all") {
        url = `/habits/logs?limit=${PAGE_SIZE}&offset=0`;
      } else {
        const days = p === "7days" ? 6 : 29;
        const from = new Date(d);
        from.setDate(from.getDate() - days);
        const dateTo = formatDateISO(d);
        const dateFrom = formatDateISO(from);
        url = `/habits/logs?date_from=${dateFrom}&date_to=${dateTo}`;
      }
      const res = await api.get(url);
      const data: HabitLogDateGroup[] = res.data;
      setGroups(data);
      setHasMore(p === "all" && data.length >= PAGE_SIZE);
    } catch {
      showToast("Failed to load logs.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const newOffset = offset + PAGE_SIZE;
      const res = await api.get(`/habits/logs?limit=${PAGE_SIZE}&offset=${newOffset}`);
      const data: HabitLogDateGroup[] = res.data;
      setGroups((prev) => [...prev, ...data]);
      setOffset(newOffset);
      setHasMore(data.length >= PAGE_SIZE);
    } catch {
      showToast("Failed to load more.", "error");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (period === "day") {
      fetchDayData(dateStr);
    } else {
      fetchRangeData(date, period);
    }
  }, [dateStr, period, date, fetchDayData, fetchRangeData]);

  const shiftDate = (days: number) => {
    setDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const handleLogDescriptive = async (habitId: number) => {
    if (!logText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("content", logText.trim());
      formData.append("log_date", dateStr);
      await api.post(`/habits/${habitId}/log-descriptive`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("Logged!", "success");
      setLogText("");
      setExpandedHabitId(null);
      // Refresh
      if (period === "day") {
        fetchDayData(dateStr);
      } else {
        fetchRangeData(date, period);
      }
    } catch {
      showToast("Failed to log.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const periodButtons: { key: Period; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "7days", label: "7 Days" },
    { key: "30days", label: "30 Days" },
    { key: "all", label: "All" },
  ];

  const renderLogTypeBadge = (logType: string) => {
    const config = LOG_TYPE_CONFIG[logType] || LOG_TYPE_CONFIG.manual;
    const Icon = config.icon;
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: config.bg, color: config.fg }}
      >
        <Icon style={{ width: 10, height: 10 }} />
        {config.label}
      </span>
    );
  };

  const renderHabitCard = (
    habit: Habit,
    log: HabitLog | null,
    showLogButton: boolean,
  ) => {
    const isExpanded = expandedHabitId === habit.id;

    return (
      <div
        key={`${habit.id}-${log?.id ?? "unlogged"}`}
        className="rounded-xl bg-surface shadow-sm overflow-hidden"
        style={{ borderLeft: `4px solid ${habit.color}` }}
      >
        <div className="flex items-start gap-3 p-3">
          {/* Habit icon */}
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full mt-0.5"
            style={{ backgroundColor: habit.color + "20" }}
          >
            <HabitIcon icon={habit.icon} size={18} color={habit.color} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-text truncate">{habit.name}</span>
              {log && renderLogTypeBadge(log.log_type)}
            </div>

            {log?.content ? (
              <p className="text-sm text-text-secondary leading-relaxed">{log.content}</p>
            ) : !log ? (
              <p className="text-xs text-text-secondary italic">No entry yet</p>
            ) : null}

            {log?.image_url && (
              <div className="mt-2">
                <img
                  src={log.image_url.startsWith("http") ? log.image_url : `/api${log.image_url}`}
                  alt="Log"
                  className="rounded-lg max-h-40 object-cover"
                />
              </div>
            )}
          </div>

          {/* Log button */}
          {showLogButton && (
            <button
              onClick={() => {
                if (isExpanded) {
                  setExpandedHabitId(null);
                  setLogText("");
                } else {
                  setExpandedHabitId(habit.id);
                  setLogText("");
                }
              }}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: habit.color }}
            >
              <Plus style={{ width: 12, height: 12 }} />
              Log
            </button>
          )}
        </div>

        {/* Inline log form */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-border pt-3 mx-3">
            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder={`What did you do for "${habit.name}"?`}
              rows={2}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary resize-none mb-2"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setExpandedHabitId(null);
                  setLogText("");
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLogDescriptive(habit.id)}
                disabled={!logText.trim() || submitting}
                className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: habit.color }}
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Day mode rendering
  const renderDayView = () => {
    const logged = dayItems.filter((item) => item.completed_today && item.logs.length > 0);
    const unlogged = dayItems.filter((item) => !item.completed_today);

    if (dayItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
          <BookOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">No descriptive habits found</p>
          <p className="text-xs mt-1">Create a descriptive habit to start journaling</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Logged entries */}
        {logged.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
              Logged ({logged.length})
            </h2>
            <div className="space-y-2">
              {logged.map((item) => {
                const latestLog = item.logs[item.logs.length - 1];
                return renderHabitCard(item.habit, latestLog, true);
              })}
            </div>
          </div>
        )}

        {/* Unlogged entries */}
        {unlogged.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
              Not Logged ({unlogged.length})
            </h2>
            <div className="space-y-2">
              {unlogged.map((item) => renderHabitCard(item.habit, null, true))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Multi-day / All mode rendering
  const renderMultiDayView = () => {
    if (groups.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
          <BookOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">No journal entries found</p>
          <p className="text-xs mt-1">
            {period === "all" ? "Start logging descriptive habits to see entries here" : "No entries in this period"}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.date}>
            {/* Date section header */}
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                {formatSectionDate(group.date)}
              </h2>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              {/* Logged entries */}
              {group.entries.map((entry) =>
                renderHabitCard(entry.habit, entry.log, false)
              )}

              {/* Unlogged habits */}
              {group.unlogged.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {group.unlogged.map((habit) => (
                    <span
                      key={habit.id}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-text-secondary bg-gray-50 border border-border"
                    >
                      <HabitIcon icon={habit.icon} size={12} color={habit.color} />
                      {habit.name}
                      <span className="text-[10px] italic opacity-60">not logged</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Load more button for All mode */}
        {period === "all" && hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 text-sm font-semibold text-primary shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
            >
              {loadingMore ? (
                <>Loading...</>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Load More
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

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

      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="h-6 w-6" style={{ color: COLORS.primary }} />
        <h1 className="text-2xl font-bold text-text">Logs</h1>
      </div>

      {/* Period Toggle */}
      <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
        {periodButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setPeriod(btn.key)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              period === btn.key
                ? "bg-white text-primary shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : period === "day" ? (
        renderDayView()
      ) : (
        renderMultiDayView()
      )}
    </div>
  );
}
