import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../utils/constants";
import { useToast } from "../components/Toast";
import type { TodoItemData } from "./tabs/types";

interface TodoSummaryData {
  total: number;
  done: number;
  pending: number;
  items: TodoItemData[];
}

export default function TodoScreen() {
  const route = useRoute<any>();
  const { habitId, habitName, habitColor, dateStr } = route.params;
  const color = habitColor || COLORS.primary;
  const { showToast } = useToast();

  const [summary, setSummary] = useState<TodoSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await client.get(
        `/habits/${habitId}/todos?date=${dateStr}`
      );
      setSummary(res.data);
    } catch {
      showToast("Failed to load todos.", "error");
    } finally {
      setLoading(false);
    }
  }, [habitId, dateStr]);

  useEffect(() => {
    setLoading(true);
    fetchTodos();
  }, [fetchTodos]);

  const addItem = async () => {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    try {
      await client.post(`/habits/${habitId}/todos`, {
        text,
        created_date: dateStr,
      });
      setNewText("");
      fetchTodos();
    } catch {
      showToast("Failed to add item.", "error");
    } finally {
      setAdding(false);
    }
  };

  const toggleItem = async (item: TodoItemData) => {
    try {
      await client.patch(
        `/habits/${habitId}/todos/${item.id}?date=${dateStr}`,
        { is_done: !item.is_done }
      );
      fetchTodos();
    } catch {
      showToast("Failed to update item.", "error");
    }
  };

  const handleLongPress = (item: TodoItemData) => {
    Alert.alert(item.text, "What would you like to do?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        onPress: async () => {
          try {
            await client.patch(
              `/habits/${habitId}/todos/${item.id}/archive`
            );
            showToast("Item archived.", "info");
            fetchTodos();
          } catch {
            showToast("Failed to archive item.", "error");
          }
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await client.delete(
              `/habits/${habitId}/todos/${item.id}`
            );
            showToast("Item deleted.", "info");
            fetchTodos();
          } catch {
            showToast("Failed to delete item.", "error");
          }
        },
      },
    ]);
  };

  const doneCount = summary?.done ?? 0;
  const totalCount = summary?.total ?? 0;
  const progress =
    totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const renderItem = ({ item }: { item: TodoItemData }) => (
    <TouchableOpacity
      style={styles.todoItem}
      onPress={() => toggleItem(item)}
      onLongPress={() => handleLongPress(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.todoCheckbox,
          item.is_done && {
            backgroundColor: color,
            borderColor: color,
          },
        ]}
      >
        {item.is_done && (
          <Ionicons name="checkmark" size={16} color="#FFF" />
        )}
      </View>
      <View style={styles.todoTextContainer}>
        <Text
          style={[
            styles.todoText,
            item.is_done && styles.todoTextDone,
          ]}
        >
          {item.text}
        </Text>
        {item.is_carried_over && (
          <View style={styles.carriedBadge}>
            <Ionicons
              name="arrow-forward-circle-outline"
              size={12}
              color={COLORS.textSecondary}
            />
            <Text style={styles.carriedBadgeText}>
              carried over
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerBadge, { backgroundColor: color + "20" }]}>
          <Text style={[styles.headerBadgeText, { color }]}>
            {habitName}
          </Text>
        </View>
        <Text style={styles.headerProgress}>
          {doneCount} / {totalCount} done
        </Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        ref={flatListRef}
        data={summary?.items ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="list-outline"
              size={48}
              color={COLORS.border}
            />
            <Text style={styles.emptyText}>
              No items yet. Add your first todo below.
            </Text>
          </View>
        }
      />

      {/* Bottom input */}
      <View style={styles.inputBar}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Add a new item..."
          placeholderTextColor={COLORS.textSecondary}
          value={newText}
          onChangeText={setNewText}
          onSubmitEditing={addItem}
          returnKeyType="done"
          maxLength={200}
        />
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: color },
            (!newText.trim() || adding) && { opacity: 0.4 },
          ]}
          onPress={addItem}
          disabled={!newText.trim() || adding}
          activeOpacity={0.8}
        >
          {adding ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Ionicons name="add" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  header: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  headerBadgeText: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerProgress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  todoCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  todoTextContainer: {
    flex: 1,
  },
  todoText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  todoTextDone: {
    textDecorationLine: "line-through",
    color: COLORS.textSecondary,
  },
  carriedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  carriedBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
