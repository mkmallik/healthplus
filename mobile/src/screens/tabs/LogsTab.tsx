import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../../api/client";
import { COLORS } from "../../utils/constants";
import PeriodToggle, { Period } from "../../components/PeriodToggle";
import type { TabProps, HabitTodayItem } from "./types";

const LOG_TYPE_ICONS: Record<string, string> = {
  text: "create-outline",
  voice: "mic-outline",
  image: "camera-outline",
  manual: "checkmark-circle-outline",
};

interface HabitLogDateGroup {
  date: string;
  entries: { habit: any; log: any }[];
  unlogged: any[];
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatSectionDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) {
    return "Today";
  }
  if (d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) {
    return "Yesterday";
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

const PAGE_SIZE = 20;

export default function LogsTab({ selectedDate, isToday, dateStr }: TabProps) {
  const navigation = useNavigation<any>();
  const [period, setPeriod] = useState<Period>("day");
  const [items, setItems] = useState<HabitTodayItem[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [multiDayData, setMultiDayData] = useState<HabitLogDateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const fetchData = useCallback(async (append = false) => {
    try {
      if (period === "day") {
        const [habitsRes, exerciseRes] = await Promise.all([
          client.get(`/habits/today?date=${dateStr}`),
          client.get(`/exercise/?date=${dateStr}`).catch(() => ({ data: { exercises: [] } })),
        ]);
        setItems(habitsRes.data);
        setExercises(exerciseRes.data?.exercises || []);
        setMultiDayData([]);
        setHasMore(false);
      } else if (period === "all") {
        const currentOffset = append ? offsetRef.current : 0;
        const res = await client.get(`/habits/logs?limit=${PAGE_SIZE}&offset=${currentOffset}`);
        const newData: HabitLogDateGroup[] = res.data;
        if (append) {
          setMultiDayData((prev) => [...prev, ...newData]);
        } else {
          setMultiDayData(newData);
        }
        setHasMore(newData.length >= PAGE_SIZE);
        offsetRef.current = currentOffset + newData.length;
        setItems([]);
      } else {
        const daysBack = period === "7days" ? 6 : 29;
        const fromDate = new Date(selectedDate);
        fromDate.setDate(fromDate.getDate() - daysBack);
        const fromStr = formatDateISO(fromDate);
        const res = await client.get(`/habits/logs?date_from=${fromStr}&date_to=${dateStr}`);
        setMultiDayData(res.data);
        setItems([]);
        setHasMore(false);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [dateStr, period, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      offsetRef.current = 0;
      fetchData(false);
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    offsetRef.current = 0;
    fetchData(false);
  }, [fetchData]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || period !== "all") return;
    setLoadingMore(true);
    fetchData(true);
  }, [loadingMore, hasMore, period, fetchData]);

  const navigateToLog = (habit: any, targetDate: string) => {
    navigation.navigate("DescriptiveHabitLog", {
      habitId: habit.id,
      habitName: habit.name,
      habitColor: habit.color,
      initialMode: "text",
      logDate: targetDate,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <PeriodToggle period={period} onChange={setPeriod} />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  // Multi-day mode (7days, 30days, all)
  if (period !== "day") {
    const sections = multiDayData.map((group) => {
      const habitCards: { habit: any; logs: any[] }[] = [];
      const habitMap = new Map<number, { habit: any; logs: any[] }>();

      for (const e of group.entries) {
        const existing = habitMap.get(e.habit.id);
        if (existing) {
          existing.logs.push(e.log);
        } else {
          const card = { habit: e.habit, logs: [e.log] };
          habitMap.set(e.habit.id, card);
          habitCards.push(card);
        }
      }
      for (const h of group.unlogged) {
        if (!habitMap.has(h.id)) {
          habitCards.push({ habit: h, logs: [] });
        }
      }

      return {
        title: formatSectionDate(group.date),
        dateStr: group.date,
        data: habitCards,
      };
    }).filter((s) => s.data.length > 0);

    return (
      <View style={styles.container}>
        <PeriodToggle period={period} onChange={setPeriod} />
        {sections.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="book-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No journal entries in this period.</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item, idx) => `${item.habit.id}-${idx}`}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionDateHeader}>{section.title}</Text>
            )}
            renderItem={({ item, section }) => renderHabitCard(item.habit, item.logs, section.dateStr)}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
            }
            stickySectionHeadersEnabled={false}
            onEndReached={period === "all" ? loadMore : undefined}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ paddingVertical: 16 }} />
              ) : null
            }
          />
        )}
      </View>
    );
  }

  // Single-day mode
  const descriptiveHabits = items.filter(
    (i) => (i.habit.habit_type || "boolean") === "descriptive"
  );

  const habitCards = descriptiveHabits.map((item) => {
    const logsWithContent = item.logs.filter((l) => l.content);
    return { habit: item.habit, logs: logsWithContent };
  });

  function renderHabitCard(habit: any, logs: any[], targetDate: string) {
    const hasLogs = logs.length > 0;
    const isUnlogged = !hasLogs;

    return (
      <View style={[styles.habitCard, { borderLeftColor: isUnlogged ? habit.color + "60" : habit.color }]}>
        {/* Header */}
        <View style={styles.habitCardHeader}>
          <View style={[styles.habitIconCircle, { backgroundColor: habit.color + (isUnlogged ? "10" : "20") }]}>
            <Ionicons name={habit.icon as any} size={18} color={isUnlogged ? habit.color + "80" : habit.color} />
          </View>
          <Text style={[styles.habitCardName, isUnlogged && { color: COLORS.textSecondary }]}>{habit.name}</Text>
          <TouchableOpacity
            style={[styles.logCta, { borderColor: habit.color }]}
            onPress={() => navigateToLog(habit, targetDate)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={14} color={habit.color} />
            <Text style={[styles.logCtaText, { color: habit.color }]}>Log</Text>
          </TouchableOpacity>
        </View>

        {/* Combined logs content */}
        {hasLogs && (
          <TouchableOpacity
            onPress={() => navigateToLog(habit, targetDate)}
            activeOpacity={0.7}
            style={styles.logsContent}
          >
            {logs.map((log, idx) => {
              const logType = log.log_type || "text";
              const iconName = LOG_TYPE_ICONS[logType] || "create-outline";
              return (
                <View key={log.id} style={idx > 0 ? styles.logDivider : undefined}>
                  <View style={styles.logTypeRow}>
                    <Ionicons name={iconName as any} size={12} color={habit.color} />
                    <Text style={[styles.logTypeLabel, { color: habit.color }]}>{logType}</Text>
                  </View>
                  <Text style={styles.logText}>{log.content}</Text>
                  {log.image_url && (
                    <Image
                      source={{ uri: log.image_url.startsWith("http") ? log.image_url : `${client.defaults.baseURL?.replace("/api", "")}${log.image_url}` }}
                      style={styles.logImage}
                      resizeMode="cover"
                    />
                  )}
                </View>
              );
            })}
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
      >
        <PeriodToggle period={period} onChange={setPeriod} />

        {habitCards.length > 0 ? (
          habitCards.map((card) => (
            <View key={card.habit.id}>
              {renderHabitCard(card.habit, card.logs, dateStr)}
            </View>
          ))
        ) : (
          exercises.length === 0 ? (
            <View style={styles.noEntriesHint}>
              <Ionicons name="book-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.noEntriesText}>
                No descriptive habits yet. Create descriptive habits to start journaling.
              </Text>
            </View>
          ) : null
        )}

        {/* Exercise Logs */}
        {exercises.length > 0 && (
          <View style={styles.exerciseSection}>
            <View style={styles.exerciseSectionHeader}>
              <Ionicons name="fitness" size={18} color={COLORS.exercise} />
              <Text style={styles.exerciseSectionTitle}>Exercises</Text>
            </View>
            {exercises.map((ex: any) => (
              <View key={ex.id} style={styles.exerciseCard}>
                <View style={styles.exerciseCardHeader}>
                  <View style={[styles.exerciseBadge, { backgroundColor: COLORS.exercise + "20" }]}>
                    <Text style={[styles.exerciseBadgeText, { color: COLORS.exercise }]}>
                      {ex.exercise_type || "Exercise"}
                    </Text>
                  </View>
                  <Text style={styles.exerciseStats}>
                    {Math.round(ex.duration_minutes || 0)} min / {Math.round(ex.calories_burned || 0)} kcal
                  </Text>
                </View>
                {ex.description ? (
                  <Text style={styles.exerciseDesc} numberOfLines={2}>{ex.description}</Text>
                ) : null}
                {ex.summary ? (
                  <Text style={styles.exerciseSummary} numberOfLines={2}>{ex.summary}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionDateHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
    marginTop: 16,
    marginHorizontal: 16,
  },

  // Habit card (one per habit per day)
  habitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  habitCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  habitIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  habitCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  logCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  logCtaText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Logs content area within a card
  logsContent: {
    marginTop: 10,
  },
  logDivider: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  logTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  logTypeLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  logText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  logImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: COLORS.background,
  },

  exerciseSection: {
    marginTop: 16,
  },
  exerciseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  exerciseSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  exerciseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.exercise,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  exerciseCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exerciseBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  exerciseStats: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  exerciseDesc: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 6,
  },
  exerciseSummary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
    lineHeight: 17,
  },
  noEntriesHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
  },
  noEntriesText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
