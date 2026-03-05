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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS, MEAL_LABELS } from "../utils/constants";
import { useToast } from "../components/Toast";

interface RecentFood {
  id: number;
  description: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_path: string | null;
}

const METHOD_CARDS = [
  { key: "camera", icon: "camera" as const, label: "Scan Food", color: COLORS.primary, screen: "Camera" },
  { key: "text", icon: "create" as const, label: "Type Food", color: COLORS.protein, screen: "TextEntry" },
  { key: "voice", icon: "mic" as const, label: "Voice Log", color: COLORS.carbs, screen: "VoiceEntry" },
  { key: "library", icon: "book" as const, label: "Food Library", color: COLORS.snack, screen: "Library" },
  { key: "saved", icon: "bookmark" as const, label: "Saved Meals", color: COLORS.accent, screen: "SavedMeals" },
  { key: "exercise", icon: "fitness" as const, label: "Exercise", color: COLORS.exercise, screen: "ExerciseLog" },
  { key: "steps", icon: "footsteps" as const, label: "Steps", color: COLORS.steps, screen: "StepLog" },
  { key: "metrics", icon: "body" as const, label: "Body Metrics", color: COLORS.weight, screen: "BodyMetric" },
  { key: "habits", icon: "checkmark-done" as const, label: "Habits", color: COLORS.streak, screen: "Habits" },
];

export default function AddFoodScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchRecent = async () => {
        try {
          const res = await client.get("/food/recent");
          setRecentFoods(res.data.slice(0, 5));
        } catch {
          // Silently handle
        } finally {
          setLoading(false);
        }
      };
      fetchRecent();
    }, [])
  );

  const handleMethodPress = (screen: string) => {
    if (screen === "Library") {
      navigation.navigate("Home", { screen: "Library" });
    } else {
      navigation.navigate(screen);
    }
  };

  const handleRelogFood = (food: RecentFood) => {
    const mealTypes = Object.keys(MEAL_LABELS);
    Alert.alert(
      "Log as which meal?",
      food.description || "Food item",
      [
        ...mealTypes.map((mt) => ({
          text: MEAL_LABELS[mt],
          onPress: async () => {
            try {
              await client.post("/food/relog", {
                food_id: food.id,
                meal_type: mt,
              });
              navigation.navigate("Home", { screen: "Today" });
            } catch {
              showToast("Failed to log food.", "error");
            }
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Log</Text>
        <Text style={styles.subtitle}>Choose what you want to track</Text>

        {/* Method cards grid */}
        <View style={styles.grid}>
          {METHOD_CARDS.map((card) => (
            <TouchableOpacity
              key={card.key}
              style={styles.methodCard}
              onPress={() => handleMethodPress(card.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: card.color + "20" }]}>
                <Ionicons name={card.icon} size={28} color={card.color} />
              </View>
              <Text style={styles.methodLabel}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Foods */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Foods</Text>
            {recentFoods.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate("RecentFoods")}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 16 }} />
          ) : recentFoods.length === 0 ? (
            <Text style={styles.emptyText}>No recent foods yet. Start logging!</Text>
          ) : (
            recentFoods.map((food) => (
              <TouchableOpacity
                key={food.id}
                style={styles.recentItem}
                onPress={() => handleRelogFood(food)}
                activeOpacity={0.7}
              >
                <View style={styles.recentItemLeft}>
                  <Ionicons
                    name={food.image_path ? "image-outline" : "restaurant-outline"}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                  <View style={styles.recentItemText}>
                    <Text style={styles.recentFoodName} numberOfLines={1}>
                      {food.description || "Food item"}
                    </Text>
                    <Text style={styles.recentFoodCal}>
                      {Math.round(food.calories)} kcal  |  P:{Math.round(food.protein)}g  C:{Math.round(food.carbs)}g  F:{Math.round(food.fat)}g
                    </Text>
                  </View>
                </View>
                <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  methodCard: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  recentSection: {
    marginTop: 28,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  recentItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  recentItemText: {
    marginLeft: 12,
    flex: 1,
  },
  recentFoodName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  recentFoodCal: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
