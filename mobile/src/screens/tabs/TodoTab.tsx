import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import client from "../../api/client";
import { COLORS } from "../../utils/constants";
import { useToast } from "../../components/Toast";
import type { TabProps, HabitTodayItem, TodoItemData } from "./types";

export default function TodoTab({ selectedDate, isToday, dateStr }: TabProps) {
  const { showToast } = useToast();
  const [todayHabits, setTodayHabits] = useState<HabitTodayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTexts, setNewTexts] = useState<Record<number, string>>({});
  const [adding, setAdding] = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const res = await client.get(`/habits/today?date=${dateStr}`);
      const all: HabitTodayItem[] = res.data;
      setTodayHabits(all.filter((h) => (h.habit.habit_type || "boolean") === "todo"));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const toggleItem = async (habitId: number, item: TodoItemData) => {
    try {
      await client.patch(`/habits/${habitId}/todos/${item.id}?date=${dateStr}`, {
        is_done: !item.is_done,
      });
      fetchData();
    } catch {
      showToast("Failed to update item.", "error");
    }
  };

  const addItem = async (habitId: number) => {
    const text = (newTexts[habitId] || "").trim();
    if (!text) return;
    setAdding((prev) => ({ ...prev, [habitId]: true }));
    try {
      await client.post(`/habits/${habitId}/todos`, {
        text,
        created_date: dateStr,
      });
      setNewTexts((prev) => ({ ...prev, [habitId]: "" }));
      fetchData();
    } catch {
      showToast("Failed to add item.", "error");
    } finally {
      setAdding((prev) => ({ ...prev, [habitId]: false }));
    }
  };

  const totalDone = todayHabits.reduce((sum, h) => sum + (h.todo_summary?.done ?? 0), 0);
  const totalItems = todayHabits.reduce((sum, h) => sum + (h.todo_summary?.total ?? 0), 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (todayHabits.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="list-outline" size={48} color={COLORS.border} />
        <Text style={styles.emptyText}>No todo habits yet.</Text>
        <Text style={styles.emptyHint}>
          Create a habit with type "Todo" in the Habits tab.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={120}
        enableResetScrollToCoords={false}
      >
        {/* Overall progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>
            {isToday ? "Today's Todos" : "Todos"}
          </Text>
          <Text style={styles.progressCount}>
            {totalDone} / {totalItems} done
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: totalItems > 0 ? `${(totalDone / totalItems) * 100}%` : "0%" },
              ]}
            />
          </View>
        </View>

        {/* Each todo habit as a section */}
        {todayHabits.map((item) => {
          const color = item.habit.color;
          const summary = item.todo_summary;
          const items = summary?.items ?? [];
          const done = summary?.done ?? 0;
          const total = summary?.total ?? 0;
          const habitText = newTexts[item.habit.id] || "";
          const isAdding = adding[item.habit.id] || false;

          return (
            <View key={item.habit.id} style={styles.sectionCard}>
              {/* Section header */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: color + "20" }]}>
                  <Ionicons name={item.habit.icon as any} size={20} color={color} />
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionName}>{item.habit.name}</Text>
                  <Text style={[styles.sectionProgress, { color }]}>
                    {done}/{total} done
                  </Text>
                </View>
                {item.completed_today && (
                  <View style={[styles.doneBadge, { backgroundColor: color + "20" }]}>
                    <Ionicons name="checkmark-circle" size={16} color={color} />
                  </View>
                )}
              </View>

              {/* Todo items */}
              {items.map((todo) => (
                <TouchableOpacity
                  key={todo.id}
                  style={styles.todoItem}
                  onPress={() => toggleItem(item.habit.id, todo)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.todoCheckbox,
                      todo.is_done && { backgroundColor: color, borderColor: color },
                    ]}
                  >
                    {todo.is_done && (
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.todoText,
                      todo.is_done && styles.todoTextDone,
                    ]}
                    numberOfLines={2}
                  >
                    {todo.text}
                  </Text>
                  {todo.is_carried_over && (
                    <View style={styles.carriedBadge}>
                      <Ionicons name="arrow-forward-circle-outline" size={12} color={COLORS.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {items.length === 0 && (
                <Text style={styles.noItemsText}>No items yet</Text>
              )}

              {/* Add item input */}
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Add item..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={habitText}
                  onChangeText={(t) => setNewTexts((prev) => ({ ...prev, [item.habit.id]: t }))}
                  onSubmitEditing={() => addItem(item.habit.id)}
                  returnKeyType="done"
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[
                    styles.addBtn,
                    { backgroundColor: color },
                    (!habitText.trim() || isAdding) && { opacity: 0.4 },
                  ]}
                  onPress={() => addItem(item.habit.id)}
                  disabled={!habitText.trim() || isAdding}
                  activeOpacity={0.8}
                >
                  {isAdding ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Ionicons name="add" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </KeyboardAwareScrollView>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  progressCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  sectionProgress: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  doneBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + "40",
  },
  todoCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  todoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  todoTextDone: {
    textDecorationLine: "line-through",
    color: COLORS.textSecondary,
  },
  carriedBadge: {
    marginLeft: 6,
  },
  noItemsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: COLORS.text,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
