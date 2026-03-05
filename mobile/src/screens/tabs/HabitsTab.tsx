import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../../api/client";
import { COLORS } from "../../utils/constants";
import { useToast } from "../../components/Toast";
import type {
  TabProps,
  HabitData,
  HabitTodayItem,
  HabitStreakItem,
} from "./types";

const FREQUENCY_OPTIONS = ["daily", "weekly", "monthly"];
const ICON_OPTIONS = [
  "checkmark-circle",
  "water",
  "bed",
  "book",
  "leaf",
  "heart",
  "barbell",
  "bicycle",
  "walk",
  "medkit",
  "moon",
  "sunny",
];
const COLOR_OPTIONS = [
  "#00D4AA",
  "#FF4081",
  "#FFB74D",
  "#42A5F5",
  "#26C6DA",
  "#A1887F",
  "#7E57C2",
  "#66BB6A",
  "#FF6E40",
  "#EC407A",
];

export default function HabitsTab({ selectedDate, isToday, dateStr }: TabProps) {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const [todayHabits, setTodayHabits] = useState<HabitTodayItem[]>([]);
  const [streaks, setStreaks] = useState<HabitStreakItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("checkmark-circle");
  const [newColor, setNewColor] = useState("#00D4AA");
  const [newFrequency, setNewFrequency] = useState("daily");
  const [newTarget, setNewTarget] = useState("1");
  const [newHabitType, setNewHabitType] = useState<"boolean" | "descriptive" | "todo">("boolean");
  const [creating, setCreating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editHabit, setEditHabit] = useState<HabitData | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("checkmark-circle");
  const [editColor, setEditColor] = useState("#00D4AA");
  const [editFrequency, setEditFrequency] = useState("daily");
  const [editTarget, setEditTarget] = useState("1");
  const [editHabitType, setEditHabitType] = useState<"boolean" | "descriptive" | "todo">("boolean");
  const [saving, setSaving] = useState(false);

  const [actionItem, setActionItem] = useState<HabitTodayItem | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, streakRes] = await Promise.all([
        client.get(`/habits/today?date=${dateStr}`),
        client.get("/habits/streaks"),
      ]);
      setTodayHabits(todayRes.data);
      setStreaks(streakRes.data);
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

  const markComplete = async (habitId: number) => {
    try {
      await client.post(`/habits/${habitId}/log?date=${dateStr}`);
      showToast("Habit marked complete!", "success");
      fetchData();
    } catch {
      showToast("Failed to update habit.", "error");
    }
  };

  const removeLog = async (habitId: number) => {
    try {
      await client.delete(`/habits/${habitId}/log?date=${dateStr}`);
      showToast("Habit log removed.", "info");
      fetchData();
    } catch {
      showToast("Failed to remove habit log.", "error");
    }
  };

  const deleteHabit = (habitId: number, name: string) => {
    Alert.alert("Delete Habit", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await client.delete(`/habits/${habitId}`);
            showToast("Habit deleted.", "info");
            fetchData();
          } catch {
            showToast("Failed to delete habit.", "error");
          }
        },
      },
    ]);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await client.post("/habits", {
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
        frequency: newFrequency,
        frequency_target: parseInt(newTarget, 10) || 1,
        habit_type: newHabitType,
      });
      setShowModal(false);
      setNewName("");
      setNewIcon("checkmark-circle");
      setNewColor("#00D4AA");
      setNewFrequency("daily");
      setNewTarget("1");
      setNewHabitType("boolean");
      showToast("Habit created!", "success");
      fetchData();
    } catch {
      showToast("Failed to create habit.", "error");
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (habit: HabitData) => {
    setEditHabit(habit);
    setEditName(habit.name);
    setEditIcon(habit.icon);
    setEditColor(habit.color);
    setEditFrequency(habit.frequency);
    setEditTarget(String(habit.frequency_target));
    setEditHabitType((habit.habit_type || "boolean") as "boolean" | "descriptive" | "todo");
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editHabit || !editName.trim()) return;
    setSaving(true);
    try {
      await client.put(`/habits/${editHabit.id}`, {
        name: editName.trim(),
        icon: editIcon,
        color: editColor,
        frequency: editFrequency,
        frequency_target: parseInt(editTarget, 10) || 1,
        habit_type: editHabitType,
      });
      setShowEditModal(false);
      setEditHabit(null);
      showToast("Habit updated!", "success");
      fetchData();
    } catch {
      showToast("Failed to update habit.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openActionSheet = (item: HabitTodayItem) => {
    setActionItem(item);
    setShowActionSheet(true);
  };

  const closeActionSheet = () => {
    setShowActionSheet(false);
    setActionItem(null);
  };

  const completedCount = todayHabits.filter((h) => h.completed_today).length;
  const totalCount = todayHabits.length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress header */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>
            {isToday ? "Today's Habits" : "Habits"}
          </Text>
          <Text style={styles.progressCount}>
            {completedCount} / {totalCount} completed
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%",
                },
              ]}
            />
          </View>
        </View>

        {/* Add Habit button */}
        <TouchableOpacity
          style={styles.addHabitButton}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.addHabitButtonText}>Add Habit</Text>
        </TouchableOpacity>

        {/* Habits list */}
        {todayHabits.map((item) => {
          const streak = streaks.find((s) => s.habit_id === item.habit.id);
          const isDescriptive = (item.habit.habit_type || "boolean") === "descriptive";
          const isTodo = (item.habit.habit_type || "boolean") === "todo";
          const todoSummary = item.todo_summary;
          return (
            <TouchableOpacity
              key={item.habit.id}
              style={styles.habitCard}
              onPress={() => openActionSheet(item)}
              onLongPress={() => {
                if (!item.habit.is_default) {
                  deleteHabit(item.habit.id, item.habit.name);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.habitIcon, { backgroundColor: item.habit.color + "20" }]}>
                <Ionicons
                  name={item.habit.icon as any}
                  size={22}
                  color={item.habit.color}
                />
              </View>
              <View style={styles.habitInfo}>
                <View style={styles.habitNameRow}>
                  <Text style={styles.habitName}>{item.habit.name}</Text>
                  {isDescriptive && (
                    <View style={styles.descriptiveBadge}>
                      <Text style={styles.descriptiveBadgeText}>LOG</Text>
                    </View>
                  )}
                  {isTodo && (
                    <View style={[styles.descriptiveBadge, { backgroundColor: item.habit.color + "25" }]}>
                      <Text style={[styles.descriptiveBadgeText, { color: item.habit.color }]}>TODO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.habitFreq}>
                  {item.habit.frequency === "daily"
                    ? "Every day"
                    : item.habit.frequency === "weekly"
                    ? `${item.habit.frequency_target}x per week`
                    : `${item.habit.frequency_target}x per month`}
                </Text>
                {isDescriptive && item.logs.length > 0 && item.logs[item.logs.length - 1].content && (
                  <Text style={styles.habitLogContent} numberOfLines={1}>
                    {item.logs.length > 1 ? `${item.logs.length} entries — ` : ""}{item.logs[item.logs.length - 1].content}
                  </Text>
                )}
                {isTodo && todoSummary && todoSummary.total > 0 && (
                  <Text style={[styles.habitLogContent, { fontStyle: "normal", color: item.habit.color }]}>
                    {todoSummary.done}/{todoSummary.total} done
                  </Text>
                )}
              </View>
              {(streak?.current_streak ?? 0) > 0 && (
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={14} color={COLORS.streak} />
                  <Text style={styles.streakBadgeText}>{streak!.current_streak}</Text>
                </View>
              )}
              {isTodo && todoSummary ? (
                <View style={[styles.todoBadge, { borderColor: item.habit.color }]}>
                  <Text style={[styles.todoBadgeText, { color: item.habit.color }]}>
                    {todoSummary.done}/{todoSummary.total}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.checkbox,
                    item.completed_today && { backgroundColor: item.habit.color, borderColor: item.habit.color },
                  ]}
                >
                  {item.completed_today && (
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Streaks section */}
        {streaks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Streaks</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.streakRow}
            >
              {streaks.map((s) => (
                <View key={s.habit_id} style={styles.streakCard}>
                  <Ionicons
                    name={s.icon as any}
                    size={22}
                    color={s.current_streak > 0 ? s.color : COLORS.streakInactive}
                  />
                  <Text
                    style={[
                      styles.streakCount,
                      s.current_streak > 0 && { color: s.color },
                    ]}
                  >
                    {s.current_streak}
                  </Text>
                  <Text style={styles.streakLabel}>current</Text>
                  <Text style={styles.streakName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.streakLongest}>
                    Best: {s.longest_streak}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {/* Add Habit FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color={COLORS.surface} />
      </TouchableOpacity>

      {/* Action Sheet Modal */}
      <Modal visible={showActionSheet} transparent animationType="slide">
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={closeActionSheet}
        >
          <View style={styles.actionSheetContent}>
            {actionItem && (() => {
              const isDescriptive = (actionItem.habit.habit_type || "boolean") === "descriptive";
              const isTodo = (actionItem.habit.habit_type || "boolean") === "todo";
              const isCompleted = actionItem.completed_today;
              const color = actionItem.habit.color;

              return (
                <>
                  <View style={styles.actionSheetHandle} />
                  <View style={styles.actionSheetHeader}>
                    <View style={[styles.actionSheetIcon, { backgroundColor: color + "20" }]}>
                      <Ionicons name={actionItem.habit.icon as any} size={24} color={color} />
                    </View>
                    <Text style={styles.actionSheetTitle}>{actionItem.habit.name}</Text>
                  </View>

                  {isTodo ? (
                    <TouchableOpacity
                      style={[styles.actionBtnPrimary, { backgroundColor: color }]}
                      onPress={() => {
                        closeActionSheet();
                        navigation.navigate("TodoList" as never, {
                          habitId: actionItem.habit.id,
                          habitName: actionItem.habit.name,
                          habitColor: color,
                          dateStr,
                        } as never);
                      }}
                    >
                      <Ionicons name="list-outline" size={20} color="#FFF" />
                      <Text style={styles.actionBtnPrimaryText}>Open Todo List</Text>
                    </TouchableOpacity>
                  ) : isDescriptive ? (
                    isCompleted ? (
                      <>
                        {actionItem.logs.length > 0 && (
                          <View style={{ gap: 8, marginBottom: 4 }}>
                            {actionItem.logs.map((logEntry) => (
                              logEntry.content ? (
                                <View key={logEntry.id} style={[styles.actionLogPreview, { borderLeftColor: color }]}>
                                  <Text style={styles.actionLogPreviewText}>{logEntry.content}</Text>
                                </View>
                              ) : null
                            ))}
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => {
                            closeActionSheet();
                            navigation.navigate("DescriptiveHabitLog", {
                              habitId: actionItem.habit.id,
                              habitName: actionItem.habit.name,
                              habitColor: color,
                              initialMode: "text",
                              logDate: dateStr,
                            });
                          }}
                        >
                          <Ionicons name="create-outline" size={20} color={COLORS.text} />
                          <Text style={styles.actionBtnText}>Update Log</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => {
                            closeActionSheet();
                            removeLog(actionItem.habit.id);
                          }}
                        >
                          <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                          <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Remove Log</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => {
                            closeActionSheet();
                            navigation.navigate("DescriptiveHabitLog", {
                              habitId: actionItem.habit.id,
                              habitName: actionItem.habit.name,
                              habitColor: color,
                              initialMode: "text",
                              logDate: dateStr,
                            });
                          }}
                        >
                          <Ionicons name="create-outline" size={20} color={color} />
                          <Text style={[styles.actionBtnText, { color }]}>Log via Text</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => {
                            closeActionSheet();
                            navigation.navigate("DescriptiveHabitLog", {
                              habitId: actionItem.habit.id,
                              habitName: actionItem.habit.name,
                              habitColor: color,
                              initialMode: "voice",
                              logDate: dateStr,
                            });
                          }}
                        >
                          <Ionicons name="mic-outline" size={20} color={color} />
                          <Text style={[styles.actionBtnText, { color }]}>Log via Voice</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => {
                            closeActionSheet();
                            navigation.navigate("DescriptiveHabitLog", {
                              habitId: actionItem.habit.id,
                              habitName: actionItem.habit.name,
                              habitColor: color,
                              initialMode: "camera",
                              logDate: dateStr,
                            });
                          }}
                        >
                          <Ionicons name="camera-outline" size={20} color={color} />
                          <Text style={[styles.actionBtnText, { color }]}>Log via Photo</Text>
                        </TouchableOpacity>
                      </>
                    )
                  ) : (
                    isCompleted ? (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => {
                          closeActionSheet();
                          removeLog(actionItem.habit.id);
                        }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                        <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Remove Log</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtnPrimary, { backgroundColor: color }]}
                        onPress={() => {
                          closeActionSheet();
                          markComplete(actionItem.habit.id);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                        <Text style={styles.actionBtnPrimaryText}>Mark Complete</Text>
                      </TouchableOpacity>
                    )
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, { marginTop: 4 }]}
                    onPress={() => {
                      closeActionSheet();
                      openEditModal(actionItem.habit);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={20} color={COLORS.text} />
                    <Text style={styles.actionBtnText}>Edit Habit</Text>
                  </TouchableOpacity>

                  {!actionItem.habit.is_default && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        closeActionSheet();
                        deleteHabit(actionItem.habit.id, actionItem.habit.name);
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Delete Habit</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionCancelBtn}
                    onPress={closeActionSheet}
                  >
                    <Text style={styles.actionCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Habit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={100} enableResetScrollToCoords={false}>
          <View style={{ flex: 1 }} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Habit</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Habit name"
              placeholderTextColor={COLORS.textSecondary}
              value={newName}
              onChangeText={setNewName}
              maxLength={50}
            />

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeToggle, newHabitType === "boolean" && styles.typeToggleActive]}
                onPress={() => setNewHabitType("boolean")}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={newHabitType === "boolean" ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.typeToggleText, newHabitType === "boolean" && styles.typeToggleTextActive]}>Boolean</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeToggle, newHabitType === "descriptive" && styles.typeToggleActive]}
                onPress={() => setNewHabitType("descriptive")}
              >
                <Ionicons name="document-text-outline" size={18} color={newHabitType === "descriptive" ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.typeToggleText, newHabitType === "descriptive" && styles.typeToggleTextActive]}>Descriptive</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeToggle, newHabitType === "todo" && styles.typeToggleActive]}
                onPress={() => {
                  setNewHabitType("todo");
                  if (!newName.trim()) setNewName("Todo");
                }}
              >
                <Ionicons name="list-outline" size={18} color={newHabitType === "todo" ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.typeToggleText, newHabitType === "todo" && styles.typeToggleTextActive]}>Todo</Text>
              </TouchableOpacity>
            </View>
            {newHabitType === "descriptive" && (
              <Text style={styles.typeHint}>Log what you did each day via text, voice, or photo.</Text>
            )}
            {newHabitType === "todo" && (
              <Text style={styles.typeHint}>Add items, check them off. Pending items carry over.</Text>
            )}

            <Text style={styles.modalLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
              <View style={styles.optionRow}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconOption, newIcon === icon && { borderColor: newColor }]}
                    onPress={() => setNewIcon(icon)}
                  >
                    <Ionicons name={icon as any} size={22} color={newIcon === icon ? newColor : COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c }, newColor === c && styles.colorSelected]}
                  onPress={() => setNewColor(c)}
                />
              ))}
            </View>

            <Text style={styles.modalLabel}>Frequency</Text>
            <View style={styles.freqRow}>
              {FREQUENCY_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqChip, newFrequency === f && styles.freqChipActive]}
                  onPress={() => setNewFrequency(f)}
                >
                  <Text style={[styles.freqText, newFrequency === f && styles.freqTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {newFrequency !== "daily" && (
              <View style={styles.targetRow}>
                <Text style={styles.modalLabel}>Times per {newFrequency === "weekly" ? "week" : "month"}</Text>
                <TextInput
                  style={styles.targetInput}
                  value={newTarget}
                  onChangeText={setNewTarget}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, (!newName.trim() || creating) && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* Edit Habit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={100} enableResetScrollToCoords={false}>
          <View style={{ flex: 1 }} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Habit</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Habit name"
              placeholderTextColor={COLORS.textSecondary}
              value={editName}
              onChangeText={setEditName}
              maxLength={50}
            />

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeToggle, editHabitType === "boolean" && styles.typeToggleActive]}
                onPress={() => setEditHabitType("boolean")}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={editHabitType === "boolean" ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.typeToggleText, editHabitType === "boolean" && styles.typeToggleTextActive]}>Boolean</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeToggle, editHabitType === "descriptive" && styles.typeToggleActive]}
                onPress={() => setEditHabitType("descriptive")}
              >
                <Ionicons name="document-text-outline" size={18} color={editHabitType === "descriptive" ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.typeToggleText, editHabitType === "descriptive" && styles.typeToggleTextActive]}>Descriptive</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeToggle, editHabitType === "todo" && styles.typeToggleActive]}
                onPress={() => setEditHabitType("todo")}
              >
                <Ionicons name="list-outline" size={18} color={editHabitType === "todo" ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.typeToggleText, editHabitType === "todo" && styles.typeToggleTextActive]}>Todo</Text>
              </TouchableOpacity>
            </View>
            {editHabitType === "descriptive" && (
              <Text style={styles.typeHint}>Log what you did each day via text, voice, or photo.</Text>
            )}
            {editHabitType === "todo" && (
              <Text style={styles.typeHint}>Add items, check them off. Pending items carry over.</Text>
            )}

            <Text style={styles.modalLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
              <View style={styles.optionRow}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconOption, editIcon === icon && { borderColor: editColor }]}
                    onPress={() => setEditIcon(icon)}
                  >
                    <Ionicons name={icon as any} size={22} color={editIcon === icon ? editColor : COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c }, editColor === c && styles.colorSelected]}
                  onPress={() => setEditColor(c)}
                />
              ))}
            </View>

            <Text style={styles.modalLabel}>Frequency</Text>
            <View style={styles.freqRow}>
              {FREQUENCY_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqChip, editFrequency === f && styles.freqChipActive]}
                  onPress={() => setEditFrequency(f)}
                >
                  <Text style={[styles.freqText, editFrequency === f && styles.freqTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editFrequency !== "daily" && (
              <View style={styles.targetRow}>
                <Text style={styles.modalLabel}>Times per {editFrequency === "weekly" ? "week" : "month"}</Text>
                <TextInput
                  style={styles.targetInput}
                  value={editTarget}
                  onChangeText={setEditTarget}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowEditModal(false); setEditHabit(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, (!editName.trim() || saving) && { opacity: 0.5 }]}
                onPress={handleEdit}
                disabled={!editName.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 96,
  },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
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
  addHabitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  addHabitButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  habitInfo: {
    flex: 1,
  },
  habitNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  habitName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  descriptiveBadge: {
    backgroundColor: COLORS.primary + "25",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  descriptiveBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  habitFreq: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  habitLogContent: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontStyle: "italic",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: COLORS.streak + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.streak,
    marginLeft: 3,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  todoBadge: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todoBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  streakRow: {
    gap: 10,
    paddingRight: 16,
  },
  streakCard: {
    width: 110,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  streakCount: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  streakLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  streakName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 6,
    textAlign: "center",
  },
  streakLongest: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheetContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  actionSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  actionSheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  actionLogPreview: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 12,
  },
  actionLogPreviewText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginBottom: 8,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  actionCancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  actionCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  typeToggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeToggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  typeToggleActive: {
    backgroundColor: COLORS.primary + "20",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  typeToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  typeToggleTextActive: {
    color: COLORS.primary,
  },
  typeHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },
  optionScroll: {
    maxHeight: 50,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  iconOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#FFF",
  },
  freqRow: {
    flexDirection: "row",
    gap: 8,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  freqChipActive: {
    backgroundColor: COLORS.primary,
  },
  freqText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  freqTextActive: {
    color: "#FFF",
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  targetInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    width: 60,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  createBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
