import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../../api/client";
import { COLORS, MEAL_ORDER, EXERCISE_TYPES } from "../../utils/constants";
import ProgressRing from "../../components/ProgressRing";
import MacroBar from "../../components/MacroBar";
import MealSection from "../../components/MealSection";
import { useToast } from "../../components/Toast";
import type {
  TabProps,
  DailyData,
  MealData,
  StreakData,
} from "./types";

const INTENSITY_COLORS: Record<string, string> = {
  low: "#66BB6A",
  moderate: "#FFB74D",
  high: "#FF7043",
  vigorous: "#FF4757",
};

export default function FoodExerciseTab({ selectedDate, isToday, dateStr }: TabProps) {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const [data, setData] = useState<DailyData | null>(null);
  const [streaks, setStreaks] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const requests: Promise<any>[] = [
        client.get(`/dashboard/daily?date=${dateStr}`),
      ];
      if (isToday) {
        requests.push(client.get("/stats/streaks").catch(() => null));
      }
      const results = await Promise.all(requests);
      setData(results[0].data);
      if (isToday && results[1]) setStreaks(results[1].data);
      else if (!isToday) setStreaks(null);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateStr, isToday]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Refetch when screen regains focus (e.g., after editing food in FoodDetailScreen)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleDeleteFood = useCallback(async (foodId: number) => {
    try {
      await client.delete(`/food/${foodId}`);
      fetchData();
    } catch {
      showToast("Failed to delete food entry.", "error");
    }
  }, [fetchData, showToast]);

  const handleMoveFood = useCallback(async (foodId: number, targetMealType: string) => {
    try {
      await client.patch(`/food/${foodId}/move?meal_type=${targetMealType}`);
      fetchData();
    } catch {
      showToast("Failed to move food entry.", "error");
    }
  }, [fetchData, showToast]);

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const goal = data?.goal;
  const mealsByType: Record<string, MealData> = {};
  data?.meals.forEach((m) => {
    mealsByType[m.meal_type] = m;
  });

  const exerciseSummary = data?.exercise_summary;
  const exercises = exerciseSummary?.exercises || [];
  const stepSummary = data?.step_summary;
  const bodyMetrics = data?.body_metrics || [];
  const latestWeight = bodyMetrics.find((m) => m.metric_type === "weight");
  const caloriesBurnedData = data?.calories_burned;

  const totalBurned = caloriesBurnedData?.total ?? (exerciseSummary?.total_calories_burned ?? 0);
  const caloriesConsumed = Math.round(data?.total_calories ?? 0);
  const netCalories = caloriesConsumed - Math.round(totalBurned);

  const goalCalories = goal?.daily_calories ?? 2000;
  const goalProtein = goal?.daily_protein ?? 50;
  const calPercent = goalCalories > 0 ? Math.round((caloriesConsumed / goalCalories) * 100) : 0;
  const proteinPercent = goalProtein > 0 ? Math.round(((data?.total_protein ?? 0) / goalProtein) * 100) : 0;


  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Streak Banner */}
        {isToday && (streaks?.overall?.current_streak ?? 0) > 0 && (
          <TouchableOpacity
            style={styles.streakBanner}
            onPress={() => navigation.navigate("Insights")}
            activeOpacity={0.7}
          >
            <Ionicons name="flame" size={20} color={COLORS.calories} />
            <Text style={styles.streakBannerText}>
              {streaks!.overall.current_streak} day streak!
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        {data && !goal && (
          <View style={styles.goalPrompt}>
            <Text style={styles.goalPromptText}>
              You haven't set your nutrition goals yet. Set your daily goals to
              start tracking your progress.
            </Text>
          </View>
        )}

        {data && (
          <>
            {/* Calorie Progress Ring in Card */}
            <View style={styles.ringCard}>
              <ProgressRing
                current={Math.round(data.total_calories)}
                goal={goal?.daily_calories ?? 2000}
              />
            </View>

            {/* Macro Bars */}
            <View style={styles.macrosContainer}>
              <MacroBar
                label="Protein"
                current={Math.round(data.total_protein)}
                goal={goal?.daily_protein ?? 50}
                color={COLORS.protein}
                unit="g"
              />
              <MacroBar
                label="Carbs"
                current={Math.round(data.total_carbs)}
                goal={goal?.daily_carbs ?? 250}
                color={COLORS.carbs}
                unit="g"
              />
              <MacroBar
                label="Fat"
                current={Math.round(data.total_fat)}
                goal={goal?.daily_fat ?? 65}
                color={COLORS.fat}
                unit="g"
              />
            </View>

            {/* Activity Summary Row */}
            <View style={styles.activityRow}>
              <TouchableOpacity
                style={styles.activityCard}
                onPress={() => navigation.navigate("ExerciseLog")}
                activeOpacity={0.7}
              >
                <View style={[styles.activityIconCircle, { backgroundColor: COLORS.exercise + "20" }]}>
                  <Ionicons name="flame" size={20} color={COLORS.exercise} />
                </View>
                <Text style={styles.activityValue}>
                  {Math.round(totalBurned)}
                </Text>
                <Text style={styles.activityLabel}>kcal burned</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.activityCard}
                onPress={() => navigation.navigate("StepLog", {
                  stepDate: dateStr,
                  existingSteps: stepSummary?.total_steps ?? 0,
                })}
                activeOpacity={0.7}
              >
                <View style={[styles.activityIconCircle, { backgroundColor: COLORS.steps + "20" }]}>
                  <Ionicons name="footsteps" size={20} color={COLORS.steps} />
                </View>
                <Text style={styles.activityValue}>
                  {(stepSummary?.total_steps ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.activityLabel}>
                  {goal?.daily_steps
                    ? `/ ${goal.daily_steps.toLocaleString()}`
                    : "steps"}
                </Text>
                {goal?.daily_steps ? (
                  <View style={styles.stepProgressBarBg}>
                    <View
                      style={[
                        styles.stepProgressBarFill,
                        {
                          width: `${Math.min(
                            ((stepSummary?.total_steps ?? 0) / goal.daily_steps) * 100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.activityCard}
                onPress={() => navigation.navigate("BodyMetric")}
                activeOpacity={0.7}
              >
                <View style={[styles.activityIconCircle, { backgroundColor: COLORS.weight + "20" }]}>
                  <Ionicons name="scale-outline" size={20} color={COLORS.weight} />
                </View>
                <Text style={styles.activityValue}>
                  {latestWeight ? `${latestWeight.value}` : "--"}
                </Text>
                <Text style={styles.activityLabel}>
                  {latestWeight ? latestWeight.unit : "kg"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Calories Burned Breakdown */}
            {caloriesBurnedData && totalBurned > 0 && (
              <View style={styles.burnedCard}>
                <View style={styles.burnedHeader}>
                  <Ionicons name="flame" size={18} color={COLORS.exercise} />
                  <Text style={styles.burnedTitle}>Calories Burned</Text>
                  <Text style={styles.burnedTotal}>{Math.round(totalBurned)} kcal</Text>
                </View>
                <View style={styles.burnedRows}>
                  <View style={styles.burnedRow}>
                    <View style={[styles.burnedIconCircle, { backgroundColor: "#7E57C220" }]}>
                      <Ionicons name="body-outline" size={16} color="#7E57C2" />
                    </View>
                    <View style={styles.burnedRowInfo}>
                      <Text style={styles.burnedRowLabel}>BMR</Text>
                      <Text style={styles.burnedRowHint}>Resting metabolism</Text>
                    </View>
                    <Text style={[styles.burnedRowValue, { color: "#7E57C2" }]}>
                      {Math.round(caloriesBurnedData.bmr)}
                    </Text>
                  </View>
                  <View style={styles.burnedRow}>
                    <View style={[styles.burnedIconCircle, { backgroundColor: COLORS.exercise + "20" }]}>
                      <Ionicons name="fitness" size={16} color={COLORS.exercise} />
                    </View>
                    <View style={styles.burnedRowInfo}>
                      <Text style={styles.burnedRowLabel}>Exercise</Text>
                      <Text style={styles.burnedRowHint}>
                        {(exerciseSummary?.total_exercises ?? 0) > 0
                          ? `${exerciseSummary!.total_exercises} session${exerciseSummary!.total_exercises > 1 ? "s" : ""}, ${Math.round(exerciseSummary!.total_duration_minutes)} min`
                          : "No sessions today"}
                      </Text>
                    </View>
                    <Text style={[styles.burnedRowValue, { color: COLORS.exercise }]}>
                      {Math.round(caloriesBurnedData.exercise)}
                    </Text>
                  </View>
                  <View style={styles.burnedRow}>
                    <View style={[styles.burnedIconCircle, { backgroundColor: COLORS.steps + "20" }]}>
                      <Ionicons name="footsteps" size={16} color={COLORS.steps} />
                    </View>
                    <View style={styles.burnedRowInfo}>
                      <Text style={styles.burnedRowLabel}>Walking</Text>
                      <Text style={styles.burnedRowHint}>
                        {(stepSummary?.total_steps ?? 0) > 0
                          ? `${(stepSummary!.total_steps).toLocaleString()} steps`
                          : "No steps logged"}
                      </Text>
                    </View>
                    <Text style={[styles.burnedRowValue, { color: COLORS.steps }]}>
                      {Math.round(caloriesBurnedData.steps)}
                    </Text>
                  </View>
                </View>
                <View style={styles.burnedNetRow}>
                  <Text style={styles.burnedNetLabel}>Net Calories</Text>
                  <Text style={[styles.burnedNetValue, { color: netCalories > 0 ? COLORS.calories : COLORS.primary }]}>
                    {netCalories > 0 ? "+" : ""}{netCalories.toLocaleString()} kcal
                  </Text>
                </View>
              </View>
            )}

            {/* Exercises */}
            {exercises.length > 0 && (
              <View style={styles.exerciseSection}>
                <View style={styles.exerciseSectionHeader}>
                  <Ionicons name="fitness" size={18} color={COLORS.exercise} />
                  <Text style={styles.exerciseSectionTitle}>
                    {isToday ? "Today's Exercises" : "Exercises"}
                  </Text>
                </View>
                {exercises.map((ex) => (
                  <View key={ex.id} style={styles.exerciseItem}>
                    <View style={styles.exerciseItemTop}>
                      <View style={[styles.exerciseTypeBadge, { backgroundColor: (INTENSITY_COLORS[ex.intensity] || COLORS.exercise) + "20" }]}>
                        <Text style={[styles.exerciseTypeBadgeText, { color: INTENSITY_COLORS[ex.intensity] || COLORS.exercise }]}>
                          {EXERCISE_TYPES[ex.exercise_type] || ex.exercise_type}
                        </Text>
                      </View>
                      <View style={styles.exerciseDetails}>
                        <Text style={styles.exerciseStat}>{Math.round(ex.duration_minutes)} min</Text>
                        <Text style={styles.exerciseStatSep}> / </Text>
                        <Text style={styles.exerciseStat}>{Math.round(ex.calories_burned)} kcal</Text>
                      </View>
                      <View style={[styles.intensityDot, { backgroundColor: INTENSITY_COLORS[ex.intensity] || COLORS.exercise }]} />
                    </View>
                    {ex.description ? (
                      <Text style={styles.exerciseDesc} numberOfLines={1}>{ex.description}</Text>
                    ) : null}
                    {ex.summary ? (
                      <Text style={styles.exerciseSummary} numberOfLines={2}>{ex.summary}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {/* Meal Sections */}
            <View style={styles.mealsContainer}>
              {MEAL_ORDER.map((mealKey) => {
                const meal = mealsByType[mealKey];
                return (
                  <MealSection
                    key={mealKey}
                    mealType={mealKey}
                    mealId={meal?.id}
                    foods={meal?.foods ?? []}
                    totalCalories={meal?.total_calories ?? 0}
                    onDeleteFood={handleDeleteFood}
                    onMoveFood={handleMoveFood}
                  />
                );
              })}
            </View>

            {/* Nutrition Summary */}
            {caloriesConsumed > 0 && (
              <View style={styles.insightsCard}>
                <View style={styles.insightsHeader}>
                  <Ionicons name="nutrition-outline" size={18} color={COLORS.accent} />
                  <Text style={styles.insightsTitle}>Nutrition Summary</Text>
                </View>
                <View style={styles.nutritionStatsRow}>
                  <View style={styles.nutritionStat}>
                    <Text style={[styles.nutritionStatValue, { color: COLORS.calories }]}>{caloriesConsumed}</Text>
                    <Text style={styles.nutritionStatLabel}>kcal</Text>
                  </View>
                  <View style={styles.nutritionStat}>
                    <Text style={[styles.nutritionStatValue, { color: COLORS.protein }]}>{Math.round(data.total_protein)}g</Text>
                    <Text style={styles.nutritionStatLabel}>protein</Text>
                  </View>
                  <View style={styles.nutritionStat}>
                    <Text style={[styles.nutritionStatValue, { color: COLORS.carbs }]}>{Math.round(data.total_carbs)}g</Text>
                    <Text style={styles.nutritionStatLabel}>carbs</Text>
                  </View>
                  <View style={styles.nutritionStat}>
                    <Text style={[styles.nutritionStatValue, { color: COLORS.fat }]}>{Math.round(data.total_fat)}g</Text>
                    <Text style={styles.nutritionStatLabel}>fat</Text>
                  </View>
                </View>
                <Text style={styles.insightsText}>
                  {calPercent}% of daily calorie goal. Protein: {proteinPercent}% of target.
                  {totalBurned > 0
                    ? ` Net: ${netCalories.toLocaleString()} kcal.`
                    : ""
                  }
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddFood")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color={COLORS.surface} />
      </TouchableOpacity>
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
    paddingBottom: 96,
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  streakBannerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 8,
  },
  goalPrompt: {
    backgroundColor: COLORS.accent + "15",
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  goalPromptText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  ringCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  macrosContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  activityRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  activityCard: {
    flex: 1,
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
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  activityValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  activityLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  stepProgressBarBg: {
    width: "100%",
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  stepProgressBarFill: {
    height: 4,
    backgroundColor: COLORS.steps,
    borderRadius: 2,
  },
  burnedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  burnedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  burnedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 6,
    flex: 1,
  },
  burnedTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.exercise,
  },
  burnedRows: {
    gap: 10,
  },
  burnedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  burnedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  burnedRowInfo: {
    flex: 1,
  },
  burnedRowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  burnedRowHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  burnedRowValue: {
    fontSize: 16,
    fontWeight: "800",
    minWidth: 40,
    textAlign: "right",
  },
  burnedNetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  burnedNetLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  burnedNetValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  exerciseSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.exercise,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  exerciseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  exerciseSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  exerciseItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  exerciseItemTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseDesc: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 4,
    marginLeft: 2,
  },
  exerciseSummary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
    marginLeft: 2,
    lineHeight: 17,
  },
  exerciseTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exerciseTypeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  exerciseDetails: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  exerciseStat: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  exerciseStatSep: {
    fontSize: 13,
    color: COLORS.border,
  },
  intensityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  mealsContainer: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  insightsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  insightsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 6,
  },
  nutritionStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  nutritionStat: {
    alignItems: "center",
    flex: 1,
  },
  nutritionStatValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  nutritionStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  insightsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
