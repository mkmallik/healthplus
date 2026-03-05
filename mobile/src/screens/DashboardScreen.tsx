import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS, MEAL_LABELS, MEAL_ORDER, getScoreColor } from "../utils/constants";
import ProgressRing from "../components/ProgressRing";
import MacroBar from "../components/MacroBar";
import WeeklyChart from "../components/WeeklyChart";

type TabKey = "daily" | "weekly" | "monthly";

interface GoalData {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
}

interface FoodAnalysis {
  health_score: number;
  sugar_spike_risk: string;
}

interface FoodItem {
  id: number;
  description: string;
  calories: number;
  analysis?: FoodAnalysis | null;
}

interface MealData {
  id: number;
  meal_type: string;
  date: string;
  foods: FoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

interface ExerciseSummaryData {
  total_exercises: number;
  total_calories_burned: number;
  total_duration_minutes: number;
}

interface StepSummaryData {
  total_steps: number;
}

interface BodyMetricData {
  metric_type: string;
  value: number;
  unit: string;
}

interface CaloriesBurnedData {
  exercise: number;
  steps: number;
  bmr: number;
  total: number;
}

interface DailyData {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  total_sugar: number;
  total_sodium: number;
  goal: GoalData | null;
  meals: MealData[];
  exercise_summary?: ExerciseSummaryData | null;
  step_summary?: StepSummaryData | null;
  body_metrics?: BodyMetricData[] | null;
  calories_burned?: CaloriesBurnedData | null;
}

interface WeeklyData {
  start_date: string;
  end_date: string;
  days: DailyData[];
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
}

interface MonthlyData {
  year: number;
  month: number;
  days: DailyData[];
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const formatShortDate = (date: Date): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const formatDateISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatMonthYear = (date: Date): string => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatWeekRange = (start: string, end: string): string => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${months[s.getMonth()]} ${s.getDate()} - ${months[e.getMonth()]} ${e.getDate()}`;
};

const formatDayLabel = (dateStr: string): string => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const d = new Date(dateStr + "T00:00:00");
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabKey>("daily");

  const [dailyDate, setDailyDate] = useState<Date>(new Date());
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  const [weeklyDate, setWeeklyDate] = useState<Date>(new Date());
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const [monthlyDate, setMonthlyDate] = useState<Date>(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const fetchDaily = useCallback(async (date: Date) => {
    setDailyLoading(true);
    try {
      const res = await client.get(`/dashboard/daily?date=${formatDateISO(date)}`);
      setDailyData(res.data);
    } catch {
      setDailyData(null);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  const fetchWeekly = useCallback(async (date: Date) => {
    setWeeklyLoading(true);
    try {
      const res = await client.get(`/dashboard/weekly?date=${formatDateISO(date)}`);
      setWeeklyData(res.data);
    } catch {
      setWeeklyData(null);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  const fetchMonthly = useCallback(async (date: Date) => {
    setMonthlyLoading(true);
    try {
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      const res = await client.get(`/dashboard/monthly?year=${y}&month=${m}`);
      setMonthlyData(res.data);
    } catch {
      setMonthlyData(null);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "daily") fetchDaily(dailyDate);
  }, [activeTab, dailyDate, fetchDaily]);

  useEffect(() => {
    if (activeTab === "weekly") fetchWeekly(weeklyDate);
  }, [activeTab, weeklyDate, fetchWeekly]);

  useEffect(() => {
    if (activeTab === "monthly") fetchMonthly(monthlyDate);
  }, [activeTab, monthlyDate, fetchMonthly]);

  const shiftDailyDate = (days: number) => {
    setDailyDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const shiftWeeklyDate = (days: number) => {
    setWeeklyDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const shiftMonthlyDate = (months: number) => {
    setMonthlyDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + months);
      return next;
    });
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderDateNav = (label: string, onPrev: () => void, onNext: () => void) => (
    <View style={styles.dateNav}>
      <TouchableOpacity onPress={onPrev} style={styles.arrowButton}>
        <Text style={styles.arrowText}>{"<"}</Text>
      </TouchableOpacity>
      <Text style={styles.dateLabel}>{label}</Text>
      <TouchableOpacity onPress={onNext} style={styles.arrowButton}>
        <Text style={styles.arrowText}>{">"}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  const renderDaily = () => {
    if (dailyLoading) return renderLoading();
    if (!dailyData) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data for this day.</Text>
        </View>
      );
    }

    const goal = dailyData.goal;
    const sortedMeals = [...(dailyData.meals || [])].sort(
      (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
    );

    return (
      <>
        <View style={styles.ringContainer}>
          <ProgressRing
            current={Math.round(dailyData.total_calories)}
            goal={goal?.daily_calories ?? 2000}
          />
        </View>

        <View style={styles.card}>
          <MacroBar
            label="Protein"
            current={Math.round(dailyData.total_protein)}
            goal={goal?.daily_protein ?? 50}
            color={COLORS.protein}
          />
          <MacroBar
            label="Carbs"
            current={Math.round(dailyData.total_carbs)}
            goal={goal?.daily_carbs ?? 250}
            color={COLORS.carbs}
          />
          <MacroBar
            label="Fat"
            current={Math.round(dailyData.total_fat)}
            goal={goal?.daily_fat ?? 65}
            color={COLORS.fat}
          />
        </View>

        {/* Calories Burned Summary */}
        {dailyData.calories_burned && dailyData.calories_burned.total > 0 && (
          <View style={[styles.card, styles.accentBorderExercise]}>
            <View style={styles.activityCardHeader}>
              <Ionicons name="flame" size={18} color={COLORS.calories} />
              <Text style={styles.activityCardTitle}>Calories Burned</Text>
              <Text style={styles.burnedTotal}>
                {Math.round(dailyData.calories_burned.total)} kcal
              </Text>
            </View>
            <View style={styles.burnedRow}>
              <View style={styles.burnedItem}>
                <Text style={styles.burnedLabel}>BMR</Text>
                <Text style={styles.burnedValue}>{Math.round(dailyData.calories_burned.bmr)}</Text>
              </View>
              {dailyData.calories_burned.exercise > 0 && (
                <View style={styles.burnedItem}>
                  <Text style={styles.burnedLabel}>Exercise</Text>
                  <Text style={styles.burnedValue}>{Math.round(dailyData.calories_burned.exercise)}</Text>
                </View>
              )}
              {dailyData.calories_burned.steps > 0 && (
                <View style={styles.burnedItem}>
                  <Text style={styles.burnedLabel}>Steps</Text>
                  <Text style={styles.burnedValue}>{Math.round(dailyData.calories_burned.steps)}</Text>
                </View>
              )}
              <View style={styles.burnedItem}>
                <Text style={styles.burnedLabel}>Net</Text>
                <Text style={[styles.burnedValue, { color: COLORS.primary }]}>
                  {Math.round(dailyData.total_calories - dailyData.calories_burned.total)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Activity Summary Cards */}
        {(dailyData.exercise_summary?.total_exercises || dailyData.step_summary?.total_steps || (dailyData.body_metrics && dailyData.body_metrics.length > 0)) ? (
          <View style={styles.activityCards}>
            {dailyData.exercise_summary && dailyData.exercise_summary.total_exercises > 0 && (
              <View style={[styles.card, styles.accentBorderExercise]}>
                <View style={styles.activityCardHeader}>
                  <Ionicons name="fitness" size={18} color={COLORS.exercise} />
                  <Text style={styles.activityCardTitle}>Exercise</Text>
                </View>
                <Text style={styles.activityCardValue}>
                  {Math.round(dailyData.exercise_summary.total_calories_burned)} kcal burned
                </Text>
                <Text style={styles.activityCardSub}>
                  {dailyData.exercise_summary.total_exercises} session{dailyData.exercise_summary.total_exercises > 1 ? "s" : ""} · {Math.round(dailyData.exercise_summary.total_duration_minutes)} min
                </Text>
              </View>
            )}
            {dailyData.step_summary && dailyData.step_summary.total_steps > 0 && (
              <View style={[styles.card, styles.accentBorderSteps]}>
                <View style={styles.activityCardHeader}>
                  <Ionicons name="footsteps" size={18} color={COLORS.steps} />
                  <Text style={styles.activityCardTitle}>Steps</Text>
                </View>
                <Text style={styles.activityCardValue}>
                  {dailyData.step_summary.total_steps.toLocaleString()} steps
                </Text>
              </View>
            )}
            {dailyData.body_metrics && dailyData.body_metrics.length > 0 && (
              <View style={[styles.card, styles.accentBorderWeight]}>
                <View style={styles.activityCardHeader}>
                  <Ionicons name="scale-outline" size={18} color={COLORS.weight} />
                  <Text style={styles.activityCardTitle}>Body Metrics</Text>
                </View>
                {dailyData.body_metrics.map((bm: BodyMetricData, idx: number) => (
                  <Text key={idx} style={styles.activityCardValue}>
                    {bm.metric_type === "weight" ? "Weight" : "Waist"}: {bm.value} {bm.unit}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {sortedMeals.map((meal) => (
          <View key={meal.meal_type} style={styles.card}>
            <View style={styles.mealHeader}>
              <View
                style={[
                  styles.mealDot,
                  {
                    backgroundColor:
                      COLORS[meal.meal_type as keyof typeof COLORS] || COLORS.primary,
                  },
                ]}
              />
              <Text style={styles.mealTitle}>
                {MEAL_LABELS[meal.meal_type] || meal.meal_type}
              </Text>
              <Text style={styles.mealCalories}>
                {Math.round(meal.total_calories)} kcal
              </Text>
            </View>
            {meal.foods.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.foodItemRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("FoodDetail", { foodId: item.id })}
              >
                <Text style={styles.foodItemName} numberOfLines={1}>
                  {item.description}
                </Text>
                {item.analysis && (
                  <View
                    style={[
                      styles.foodScoreBadge,
                      { backgroundColor: getScoreColor(item.analysis.health_score) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.foodScoreText,
                        { color: getScoreColor(item.analysis.health_score) },
                      ]}
                    >
                      {item.analysis.health_score}/10
                    </Text>
                  </View>
                )}
                <Text style={styles.foodItemCal}>
                  {Math.round(item.calories)} kcal
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </>
    );
  };

  const renderWeekly = () => {
    if (weeklyLoading) return renderLoading();
    if (!weeklyData) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data for this week.</Text>
        </View>
      );
    }

    const chartDays = weeklyData.days.map((d) => ({
      date: d.date,
      calories: d.total_calories,
    }));

    // Get goal from first day that has one
    const goalCal =
      weeklyData.days.find((d) => d.goal)?.goal?.daily_calories ?? 2000;

    return (
      <>
        <View style={styles.card}>
          <WeeklyChart days={chartDays} goal={goalCal} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Weekly Averages</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.calories }]}>
                {Math.round(weeklyData.avg_calories)}
              </Text>
              <Text style={styles.statLabel}>Avg Calories</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.protein }]}>
                {Math.round(weeklyData.avg_protein)}g
              </Text>
              <Text style={styles.statLabel}>Avg Protein</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.carbs }]}>
                {Math.round(weeklyData.avg_carbs)}g
              </Text>
              <Text style={styles.statLabel}>Avg Carbs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.fat }]}>
                {Math.round(weeklyData.avg_fat)}g
              </Text>
              <Text style={styles.statLabel}>Avg Fat</Text>
            </View>
          </View>
        </View>
      </>
    );
  };

  const renderMonthly = () => {
    if (monthlyLoading) return renderLoading();
    if (!monthlyData) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data for this month.</Text>
        </View>
      );
    }

    const daysWithData = monthlyData.days.filter((d) => d.total_calories > 0);

    return (
      <>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Monthly Averages</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.calories }]}>
                {Math.round(monthlyData.avg_calories)}
              </Text>
              <Text style={styles.statLabel}>Avg Calories</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.protein }]}>
                {Math.round(monthlyData.avg_protein)}g
              </Text>
              <Text style={styles.statLabel}>Avg Protein</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.carbs }]}>
                {Math.round(monthlyData.avg_carbs)}g
              </Text>
              <Text style={styles.statLabel}>Avg Carbs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.fat }]}>
                {Math.round(monthlyData.avg_fat)}g
              </Text>
              <Text style={styles.statLabel}>Avg Fat</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
          {daysWithData.map((day) => (
            <View key={day.date} style={styles.monthlyDayRow}>
              <Text style={styles.monthlyDayDate}>
                {formatDayLabel(day.date)}
              </Text>
              <Text style={styles.monthlyDayCal}>
                {Math.round(day.total_calories)} kcal
              </Text>
            </View>
          ))}
          {daysWithData.length === 0 && (
            <Text style={styles.emptyText}>No entries this month.</Text>
          )}
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      {renderTabBar()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "daily" &&
          renderDateNav(
            formatShortDate(dailyDate),
            () => shiftDailyDate(-1),
            () => shiftDailyDate(1)
          )}
        {activeTab === "weekly" &&
          weeklyData &&
          renderDateNav(
            formatWeekRange(weeklyData.start_date, weeklyData.end_date),
            () => shiftWeeklyDate(-7),
            () => shiftWeeklyDate(7)
          )}
        {activeTab === "weekly" && !weeklyData && !weeklyLoading &&
          renderDateNav("Select Week", () => shiftWeeklyDate(-7), () => shiftWeeklyDate(7))}
        {activeTab === "monthly" &&
          renderDateNav(
            formatMonthYear(monthlyDate),
            () => shiftMonthlyDate(-1),
            () => shiftMonthlyDate(1)
          )}

        {activeTab === "daily" && renderDaily()}
        {activeTab === "weekly" && renderWeekly()}
        {activeTab === "monthly" && renderMonthly()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.surface,
  },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  arrowText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ringContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  mealDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  mealTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  foodItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingLeft: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  foodItemName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginRight: 8,
  },
  foodScoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  foodScoreText: {
    fontSize: 11,
    fontWeight: "700",
  },
  foodItemCal: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%" as any,
    alignItems: "center",
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  monthlyDayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  monthlyDayDate: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  monthlyDayCal: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  activityCards: {
    gap: 12,
  },
  accentBorderExercise: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.exercise,
  },
  accentBorderSteps: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.steps,
  },
  accentBorderWeight: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.weight,
  },
  activityCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  activityCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 6,
  },
  activityCardValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  activityCardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  burnedTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.calories,
    marginLeft: "auto",
  },
  burnedRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 12,
  },
  burnedItem: {
    flex: 1,
    alignItems: "center",
  },
  burnedLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  burnedValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
});
