import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS, MEAL_LABELS } from "../utils/constants";
import { useToast } from "../components/Toast";

interface SavedMealItem {
  id: number;
  description: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface SavedMeal {
  id: number;
  name: string;
  items: SavedMealItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

export default function SavedMealsScreen() {
  const { showToast } = useToast();
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchMeals = useCallback(async () => {
    try {
      const res = await client.get("/saved-meals");
      setMeals(res.data);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMeals();
    }, [fetchMeals])
  );

  const handleRelog = (meal: SavedMeal) => {
    const mealTypes = Object.keys(MEAL_LABELS);
    Alert.alert(
      "Log as which meal?",
      `${meal.name} (${Math.round(meal.total_calories)} kcal)`,
      [
        ...mealTypes.map((mt) => ({
          text: MEAL_LABELS[mt],
          onPress: async () => {
            try {
              await client.post(`/saved-meals/${meal.id}/relog`, {
                meal_type: mt,
              });
              showToast(`${meal.name} logged as ${MEAL_LABELS[mt]}.`, "success");
            } catch {
              showToast("Failed to log meal.", "error");
            }
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  const handleDelete = (meal: SavedMeal) => {
    Alert.alert(
      "Delete Saved Meal",
      `Delete "${meal.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await client.delete(`/saved-meals/${meal.id}`);
              setMeals((prev) => prev.filter((m) => m.id !== meal.id));
            } catch {
              showToast("Failed to delete meal.", "error");
            }
          },
        },
      ]
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Saved Meals</Text>

        {meals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No saved meals yet.</Text>
            <Text style={styles.emptyHint}>
              Save meals from the Meal Insights screen to quickly re-log them.
            </Text>
          </View>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggleExpand(meal.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealSummary}>
                    {meal.items.length} items  |  {Math.round(meal.total_calories)} kcal
                  </Text>
                </View>
                <Ionicons
                  name={expandedId === meal.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              {/* Expanded items */}
              {expandedId === meal.id && (
                <View style={styles.itemsContainer}>
                  {meal.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.description || "Item"}
                      </Text>
                      <Text style={styles.itemCal}>{Math.round(item.calories)} kcal</Text>
                    </View>
                  ))}
                  <View style={styles.macroRow}>
                    <Text style={[styles.macroText, { color: COLORS.protein }]}>
                      P: {Math.round(meal.total_protein)}g
                    </Text>
                    <Text style={[styles.macroText, { color: COLORS.carbs }]}>
                      C: {Math.round(meal.total_carbs)}g
                    </Text>
                    <Text style={[styles.macroText, { color: COLORS.fat }]}>
                      F: {Math.round(meal.total_fat)}g
                    </Text>
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.logButton}
                  onPress={() => handleRelog(meal)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={18} color={COLORS.surface} />
                  <Text style={styles.logButtonText}>Log This Meal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(meal)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  mealSummary: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  itemCal: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  macroRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  macroText: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  logButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  logButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: "700",
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
  },
});
