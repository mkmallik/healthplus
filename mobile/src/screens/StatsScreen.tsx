import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import client from "../api/client";
import { COLORS, MEAL_LABELS, MEAL_ORDER, getScoreColor } from "../utils/constants";
import ProgressRing from "../components/ProgressRing";
import MacroBar from "../components/MacroBar";
import WeeklyChart from "../components/WeeklyChart";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - 48;

// --- Types ---

type ViewTab = "overview" | "streaks" | "trends";

// Overview types
type OverviewPeriod = "daily" | "weekly" | "monthly";

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

// Streaks types
interface CategoryStreak {
  current_streak: number;
  total_days: number;
}

interface StreaksData {
  food: CategoryStreak;
  exercise: CategoryStreak;
  steps: CategoryStreak;
  body_metrics: CategoryStreak;
  overall: CategoryStreak;
}

interface HabitStreakItem {
  habit_id: number;
  name: string;
  icon: string;
  color: string;
  current_streak: number;
  longest_streak: number;
  completed_today: boolean;
}

// Trends types
interface TrendPoint {
  label: string;
  value: number | null;
}

interface TrendsData {
  metric: string;
  period: string;
  data_points: TrendPoint[];
}

type MetricKey = "calories" | "steps" | "exercise" | "weight";
type PeriodKey = "week" | "month" | "year";

const VIEW_TABS: { key: ViewTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "streaks", label: "Streaks" },
  { key: "trends", label: "Trends" },
];

const OVERVIEW_PERIODS: { key: OverviewPeriod; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "calories", label: "Calories", color: COLORS.calories },
  { key: "steps", label: "Steps", color: COLORS.steps },
  { key: "exercise", label: "Exercise", color: COLORS.exercise },
  { key: "weight", label: "Weight", color: COLORS.weight },
];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "7D" },
  { key: "month", label: "30D" },
  { key: "year", label: "1Y" },
];

const STREAK_CARDS: { key: keyof StreaksData; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "overall", label: "Overall", icon: "flame" },
  { key: "food", label: "Food", icon: "restaurant" },
  { key: "exercise", label: "Exercise", icon: "fitness" },
  { key: "steps", label: "Steps", icon: "footsteps" },
  { key: "body_metrics", label: "Metrics", icon: "scale-outline" as keyof typeof Ionicons.glyphMap },
];

// Helpers
const formatDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatShortDate = (d: Date): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
};

const formatMonthYear = (d: Date): string => {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

const formatWeekRange = (start: string, end: string): string => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return `${months[s.getMonth()]} ${s.getDate()} - ${months[e.getMonth()]} ${e.getDate()}`;
};

const formatDayLabel = (dateStr: string): string => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(dateStr + "T00:00:00");
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

export default function StatsScreen() {
  const navigation = useNavigation<any>();
  const [activeView, setActiveView] = useState<ViewTab>("overview");

  // --- Overview state ---
  const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriod>("weekly");
  const [dailyDate, setDailyDate] = useState<Date>(new Date());
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [weeklyDate, setWeeklyDate] = useState<Date>(new Date());
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [monthlyDate, setMonthlyDate] = useState<Date>(new Date());
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // --- Streaks state ---
  const [streaks, setStreaks] = useState<StreaksData | null>(null);
  const [habitStreaks, setHabitStreaks] = useState<HabitStreakItem[]>([]);
  const [loadingStreaks, setLoadingStreaks] = useState(true);

  // --- Trends state ---
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("calories");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("week");
  const [loadingTrends, setLoadingTrends] = useState(true);

  // --- Fetchers ---
  const fetchDaily = useCallback(async (d: Date) => {
    setDailyLoading(true);
    try {
      const res = await client.get(`/dashboard/daily?date=${formatDateISO(d)}`);
      setDailyData(res.data);
    } catch { setDailyData(null); }
    finally { setDailyLoading(false); }
  }, []);

  const fetchWeekly = useCallback(async (d: Date) => {
    setWeeklyLoading(true);
    try {
      const res = await client.get(`/dashboard/weekly?date=${formatDateISO(d)}`);
      setWeeklyData(res.data);
    } catch { setWeeklyData(null); }
    finally { setWeeklyLoading(false); }
  }, []);

  const fetchMonthly = useCallback(async (d: Date) => {
    setMonthlyLoading(true);
    try {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const res = await client.get(`/dashboard/monthly?year=${y}&month=${m}`);
      setMonthlyData(res.data);
    } catch { setMonthlyData(null); }
    finally { setMonthlyLoading(false); }
  }, []);

  const fetchStreaks = useCallback(async () => {
    setLoadingStreaks(true);
    try {
      const [res, habitsRes] = await Promise.all([
        client.get("/stats/streaks"),
        client.get("/habits/streaks").catch(() => null),
      ]);
      setStreaks(res.data);
      if (habitsRes) setHabitStreaks(habitsRes.data);
    } catch { /* silent */ }
    finally { setLoadingStreaks(false); }
  }, []);

  const fetchTrends = useCallback(async (metric: MetricKey, period: PeriodKey) => {
    setLoadingTrends(true);
    try {
      const res = await client.get(`/stats/trends?metric=${metric}&period=${period}`);
      setTrends(res.data);
    } catch { setTrends(null); }
    finally { setLoadingTrends(false); }
  }, []);

  // Fetch on focus
  useFocusEffect(
    useCallback(() => {
      if (activeView === "overview") {
        if (overviewPeriod === "daily") fetchDaily(dailyDate);
        else if (overviewPeriod === "weekly") fetchWeekly(weeklyDate);
        else fetchMonthly(monthlyDate);
      } else if (activeView === "streaks") {
        fetchStreaks();
      } else if (activeView === "trends") {
        fetchTrends(selectedMetric, selectedPeriod);
      }
    }, [activeView, overviewPeriod, dailyDate, weeklyDate, monthlyDate, selectedMetric, selectedPeriod])
  );

  // Trigger overview fetches on period/date changes
  useEffect(() => {
    if (activeView === "overview") {
      if (overviewPeriod === "daily") fetchDaily(dailyDate);
    }
  }, [dailyDate, overviewPeriod, activeView]);
  useEffect(() => {
    if (activeView === "overview") {
      if (overviewPeriod === "weekly") fetchWeekly(weeklyDate);
    }
  }, [weeklyDate, overviewPeriod, activeView]);
  useEffect(() => {
    if (activeView === "overview") {
      if (overviewPeriod === "monthly") fetchMonthly(monthlyDate);
    }
  }, [monthlyDate, overviewPeriod, activeView]);

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

  // --- Chart Data for Trends ---
  const metricColor = METRICS.find((m) => m.key === selectedMetric)?.color ?? COLORS.primary;
  const chartPoints = trends?.data_points ?? [];
  const isWeight = selectedMetric === "weight";
  const filteredPoints = isWeight
    ? chartPoints.filter((p) => p.value !== null && p.value !== undefined)
    : chartPoints;
  const labelInterval = selectedPeriod === "month" ? 5 : selectedPeriod === "year" ? 4 : 1;
  const chartLabels = filteredPoints.map((p, i) => (i % labelInterval === 0 ? p.label : ""));
  const chartValues = filteredPoints.map((p) => (p.value ?? 0) as number);
  const nonZeroValues = chartValues.filter((v) => v > 0);
  const avg = nonZeroValues.length > 0 ? Math.round(nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length) : 0;
  const highest = nonZeroValues.length > 0 ? Math.round(Math.max(...nonZeroValues)) : 0;
  const lowest = nonZeroValues.length > 0 ? Math.round(Math.min(...nonZeroValues)) : 0;

  const chartConfig = {
    backgroundColor: COLORS.surface,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => {
      // Parse hex color and apply full opacity for brighter bars
      const hex = metricColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${Math.max(opacity, 0.9)})`;
    },
    fillShadowGradientFrom: metricColor,
    fillShadowGradientTo: metricColor,
    fillShadowGradientFromOpacity: 1,
    fillShadowGradientToOpacity: 0.85,
    labelColor: () => COLORS.textSecondary,
    propsForBackgroundLines: { strokeDasharray: "", stroke: COLORS.border, strokeWidth: 0.5 },
    propsForLabels: { fontSize: 10 },
    barPercentage: selectedPeriod === "week" ? 0.6 : 0.4,
  };

  // --- Render helpers ---

  const renderDateNav = (label: string, onPrev: () => void, onNext: () => void) => (
    <View style={styles.dateNav}>
      <TouchableOpacity onPress={onPrev} style={styles.arrowButton}>
        <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
      </TouchableOpacity>
      <Text style={styles.dateLabel}>{label}</Text>
      <TouchableOpacity onPress={onNext} style={styles.arrowButton}>
        <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  // --- OVERVIEW ---

  const renderOverviewDaily = () => {
    if (dailyLoading) return renderLoading();
    if (!dailyData) return <View style={styles.emptyContainer}><Text style={styles.emptyText}>No data for this day.</Text></View>;

    const goal = dailyData.goal;
    const sortedMeals = [...(dailyData.meals || [])].sort(
      (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
    );

    return (
      <>
        <View style={styles.ringContainer}>
          <ProgressRing current={Math.round(dailyData.total_calories)} goal={goal?.daily_calories ?? 2000} />
        </View>
        <View style={styles.card}>
          <MacroBar label="Protein" current={Math.round(dailyData.total_protein)} goal={goal?.daily_protein ?? 50} color={COLORS.protein} />
          <MacroBar label="Carbs" current={Math.round(dailyData.total_carbs)} goal={goal?.daily_carbs ?? 250} color={COLORS.carbs} />
          <MacroBar label="Fat" current={Math.round(dailyData.total_fat)} goal={goal?.daily_fat ?? 65} color={COLORS.fat} />
        </View>

        {dailyData.calories_burned && dailyData.calories_burned.total > 0 && (
          <View style={[styles.card, styles.accentBorderExercise]}>
            <View style={styles.activityCardHeader}>
              <Ionicons name="flame" size={18} color={COLORS.calories} />
              <Text style={styles.activityCardTitle}>Calories Burned</Text>
              <Text style={styles.burnedTotal}>{Math.round(dailyData.calories_burned.total)} kcal</Text>
            </View>
            <View style={styles.burnedRow}>
              <View style={styles.burnedItem}><Text style={styles.burnedLabel}>BMR</Text><Text style={styles.burnedValue}>{Math.round(dailyData.calories_burned.bmr)}</Text></View>
              {dailyData.calories_burned.exercise > 0 && <View style={styles.burnedItem}><Text style={styles.burnedLabel}>Exercise</Text><Text style={styles.burnedValue}>{Math.round(dailyData.calories_burned.exercise)}</Text></View>}
              {dailyData.calories_burned.steps > 0 && <View style={styles.burnedItem}><Text style={styles.burnedLabel}>Steps</Text><Text style={styles.burnedValue}>{Math.round(dailyData.calories_burned.steps)}</Text></View>}
              <View style={styles.burnedItem}><Text style={styles.burnedLabel}>Net</Text><Text style={[styles.burnedValue, { color: COLORS.primary }]}>{Math.round(dailyData.total_calories - dailyData.calories_burned.total)}</Text></View>
            </View>
          </View>
        )}

        {(dailyData.exercise_summary?.total_exercises || dailyData.step_summary?.total_steps || (dailyData.body_metrics && dailyData.body_metrics.length > 0)) ? (
          <View style={styles.activityCards}>
            {dailyData.exercise_summary && dailyData.exercise_summary.total_exercises > 0 && (
              <View style={[styles.card, styles.accentBorderExercise]}>
                <View style={styles.activityCardHeader}><Ionicons name="fitness" size={18} color={COLORS.exercise} /><Text style={styles.activityCardTitle}>Exercise</Text></View>
                <Text style={styles.activityCardValue}>{Math.round(dailyData.exercise_summary.total_calories_burned)} kcal burned</Text>
                <Text style={styles.activityCardSub}>{dailyData.exercise_summary.total_exercises} session{dailyData.exercise_summary.total_exercises > 1 ? "s" : ""} · {Math.round(dailyData.exercise_summary.total_duration_minutes)} min</Text>
              </View>
            )}
            {dailyData.step_summary && dailyData.step_summary.total_steps > 0 && (
              <View style={[styles.card, styles.accentBorderSteps]}>
                <View style={styles.activityCardHeader}><Ionicons name="footsteps" size={18} color={COLORS.steps} /><Text style={styles.activityCardTitle}>Steps</Text></View>
                <Text style={styles.activityCardValue}>{dailyData.step_summary.total_steps.toLocaleString()} steps</Text>
              </View>
            )}
            {dailyData.body_metrics && dailyData.body_metrics.length > 0 && (
              <View style={[styles.card, styles.accentBorderWeight]}>
                <View style={styles.activityCardHeader}><Ionicons name="scale-outline" size={18} color={COLORS.weight} /><Text style={styles.activityCardTitle}>Body Metrics</Text></View>
                {dailyData.body_metrics.map((bm, idx) => (
                  <Text key={idx} style={styles.activityCardValue}>{bm.metric_type === "weight" ? "Weight" : bm.metric_type === "waist" ? "Waist" : "Biceps"}: {bm.value} {bm.unit}</Text>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {sortedMeals.map((meal) => (
          <View key={meal.meal_type} style={styles.card}>
            <View style={styles.mealHeader}>
              <View style={[styles.mealDot, { backgroundColor: COLORS[meal.meal_type as keyof typeof COLORS] || COLORS.primary }]} />
              <Text style={styles.mealTitle}>{MEAL_LABELS[meal.meal_type] || meal.meal_type}</Text>
              <Text style={styles.mealCalories}>{Math.round(meal.total_calories)} kcal</Text>
            </View>
            {meal.foods.map((item) => (
              <TouchableOpacity key={item.id} style={styles.foodItemRow} activeOpacity={0.7} onPress={() => navigation.navigate("FoodDetail", { foodId: item.id })}>
                <Text style={styles.foodItemName} numberOfLines={1}>{item.description}</Text>
                {item.analysis && (
                  <View style={[styles.foodScoreBadge, { backgroundColor: getScoreColor(item.analysis.health_score) + "20" }]}>
                    <Text style={[styles.foodScoreText, { color: getScoreColor(item.analysis.health_score) }]}>{item.analysis.health_score}/10</Text>
                  </View>
                )}
                <Text style={styles.foodItemCal}>{Math.round(item.calories)} kcal</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </>
    );
  };

  const renderOverviewWeekly = () => {
    if (weeklyLoading) return renderLoading();
    if (!weeklyData) return <View style={styles.emptyContainer}><Text style={styles.emptyText}>No data for this week.</Text></View>;
    const chartDays = weeklyData.days.map((d) => ({ date: d.date, calories: d.total_calories }));
    const goalCal = weeklyData.days.find((d) => d.goal)?.goal?.daily_calories ?? 2000;
    return (
      <>
        <View style={styles.card}><WeeklyChart days={chartDays} goal={goalCal} /></View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Weekly Averages</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: COLORS.calories }]}>{Math.round(weeklyData.avg_calories)}</Text><Text style={styles.statLabel}>Avg Calories</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: COLORS.protein }]}>{Math.round(weeklyData.avg_protein)}g</Text><Text style={styles.statLabel}>Avg Protein</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: COLORS.carbs }]}>{Math.round(weeklyData.avg_carbs)}g</Text><Text style={styles.statLabel}>Avg Carbs</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: COLORS.fat }]}>{Math.round(weeklyData.avg_fat)}g</Text><Text style={styles.statLabel}>Avg Fat</Text></View>
          </View>
        </View>
      </>
    );
  };

  const renderOverviewMonthly = () => {
    if (monthlyLoading) return renderLoading();
    if (!monthlyData) return <View style={styles.emptyContainer}><Text style={styles.emptyText}>No data for this month.</Text></View>;
    const daysWithData = monthlyData.days.filter((d) => d.total_calories > 0);
    const goalCal = monthlyData.days.find((d) => d.goal)?.goal?.daily_calories ?? 2000;

    // Build chart data for the month
    const monthlyChartLabels = monthlyData.days.map((d, i) => {
      const day = new Date(d.date + "T00:00:00").getDate();
      // Show label every 5th day + 1st and last
      return (day === 1 || day % 5 === 0 || i === monthlyData.days.length - 1) ? String(day) : "";
    });
    const monthlyChartValues = monthlyData.days.map((d) => d.total_calories);
    const monthlyChartConfig = {
      backgroundColor: COLORS.surface,
      backgroundGradientFrom: COLORS.surface,
      backgroundGradientTo: COLORS.surface,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(0, 212, 170, ${Math.max(opacity, 0.9)})`,
      fillShadowGradientFrom: COLORS.primary,
      fillShadowGradientTo: COLORS.primary,
      fillShadowGradientFromOpacity: 1,
      fillShadowGradientToOpacity: 0.85,
      labelColor: () => COLORS.textSecondary,
      propsForBackgroundLines: { strokeDasharray: "", stroke: COLORS.border, strokeWidth: 0.5 },
      propsForLabels: { fontSize: 9 },
      barPercentage: 0.35,
    };

    return (
      <>
        {/* Monthly calorie chart */}
        {daysWithData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Monthly Overview</Text>
            <BarChart
              data={{
                labels: monthlyChartLabels,
                datasets: [{ data: monthlyChartValues.length > 0 ? monthlyChartValues : [0] }],
              }}
              width={CHART_WIDTH}
              height={200}
              chartConfig={monthlyChartConfig}
              withInnerLines
              showBarTops={false}
              showValuesOnTopOfBars={false}
              fromZero
              yAxisLabel=""
              yAxisSuffix=""
              style={styles.chart}
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Monthly Averages</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: COLORS.calories }]}>{Math.round(monthlyData.avg_calories)}</Text><Text style={styles.statLabel}>Avg Calories</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: COLORS.protein }]}>{Math.round(monthlyData.avg_protein)}g</Text><Text style={styles.statLabel}>Avg Protein</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: COLORS.carbs }]}>{Math.round(monthlyData.avg_carbs)}g</Text><Text style={styles.statLabel}>Avg Carbs</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: COLORS.fat }]}>{Math.round(monthlyData.avg_fat)}g</Text><Text style={styles.statLabel}>Avg Fat</Text></View>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
          {daysWithData.map((day) => (
            <View key={day.date} style={styles.monthlyDayRow}>
              <Text style={styles.monthlyDayDate}>{formatDayLabel(day.date)}</Text>
              <Text style={styles.monthlyDayCal}>{Math.round(day.total_calories)} kcal</Text>
            </View>
          ))}
          {daysWithData.length === 0 && <Text style={styles.emptyText}>No entries this month.</Text>}
        </View>
      </>
    );
  };

  const renderOverview = () => (
    <>
      {/* Period toggle */}
      <View style={styles.periodToggle}>
        {OVERVIEW_PERIODS.map((p) => {
          const isActive = overviewPeriod === p.key;
          return (
            <TouchableOpacity key={p.key} style={[styles.periodBtn, isActive && styles.periodBtnActive]} onPress={() => setOverviewPeriod(p.key)} activeOpacity={0.7}>
              <Text style={[styles.periodBtnText, isActive && styles.periodBtnTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date nav */}
      {overviewPeriod === "daily" && renderDateNav(formatShortDate(dailyDate), () => shiftDailyDate(-1), () => shiftDailyDate(1))}
      {overviewPeriod === "weekly" && weeklyData && renderDateNav(formatWeekRange(weeklyData.start_date, weeklyData.end_date), () => shiftWeeklyDate(-7), () => shiftWeeklyDate(7))}
      {overviewPeriod === "weekly" && !weeklyData && !weeklyLoading && renderDateNav("Select Week", () => shiftWeeklyDate(-7), () => shiftWeeklyDate(7))}
      {overviewPeriod === "monthly" && renderDateNav(formatMonthYear(monthlyDate), () => shiftMonthlyDate(-1), () => shiftMonthlyDate(1))}

      {overviewPeriod === "daily" && renderOverviewDaily()}
      {overviewPeriod === "weekly" && renderOverviewWeekly()}
      {overviewPeriod === "monthly" && renderOverviewMonthly()}
    </>
  );

  // --- STREAKS ---

  const renderStreaks = () => (
    <>
      <Text style={styles.sectionTitle}>Streaks</Text>
      {loadingStreaks ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.streakRow}>
          {STREAK_CARDS.map((card) => {
            const s = streaks?.[card.key];
            const isActive = (s?.current_streak ?? 0) > 0;
            return (
              <View key={card.key} style={[styles.streakCard, isActive && styles.streakCardActive]}>
                <Ionicons name={card.icon as any} size={22} color={isActive ? COLORS.streak : COLORS.streakInactive} />
                <Text style={[styles.streakCount, isActive && { color: COLORS.streak }]}>{s?.current_streak ?? 0}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
                <Text style={styles.streakSub}>{card.label}</Text>
                <Text style={styles.streakTotal}>{s?.total_days ?? 0} total days</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {habitStreaks.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Habit Streaks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.streakRow}>
            {habitStreaks.map((hs) => {
              const isActive = hs.current_streak > 0;
              return (
                <View key={hs.habit_id} style={[styles.streakCard, isActive && { borderWidth: 1, borderColor: hs.color + "40" }]}>
                  <Ionicons name={hs.icon as any} size={22} color={isActive ? hs.color : COLORS.streakInactive} />
                  <Text style={[styles.streakCount, isActive && { color: hs.color }]}>{hs.current_streak}</Text>
                  <Text style={styles.streakLabel}>{hs.completed_today ? "done today" : "day streak"}</Text>
                  <Text style={styles.streakSub}>{hs.name}</Text>
                  <Text style={styles.streakTotal}>Best: {hs.longest_streak}</Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </>
  );

  // --- TRENDS ---

  const renderTrends = () => (
    <>
      <Text style={styles.sectionTitle}>Trends</Text>
      <View style={styles.metricRow}>
        {METRICS.map((m) => {
          const isSelected = selectedMetric === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.metricPill, isSelected && { backgroundColor: m.color }]}
              onPress={() => { setSelectedMetric(m.key); fetchTrends(m.key, selectedPeriod); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.metricPillText, isSelected && { color: "#FFFFFF" }]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.periodToggle}>
        {PERIODS.map((p) => {
          const isSelected = selectedPeriod === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, isSelected && styles.periodBtnActive]}
              onPress={() => { setSelectedPeriod(p.key); fetchTrends(selectedMetric, p.key); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodBtnText, isSelected && styles.periodBtnTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.chartCard}>
        {loadingTrends ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
        ) : filteredPoints.length === 0 ? (
          <View style={styles.emptyChart}><Ionicons name="analytics-outline" size={40} color={COLORS.textSecondary} /><Text style={styles.emptyText}>No data for this period</Text></View>
        ) : (
          <BarChart
            data={{ labels: chartLabels, datasets: [{ data: chartValues.length > 0 ? chartValues : [0] }] }}
            width={CHART_WIDTH} height={220} chartConfig={chartConfig} withInnerLines showBarTops={false} fromZero={!isWeight} yAxisLabel="" yAxisSuffix=""
            showValuesOnTopOfBars
            style={styles.chart}
          />
        )}
      </View>

      {!loadingTrends && nonZeroValues.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: metricColor }]}>{avg.toLocaleString()}</Text><Text style={styles.summaryLabel}>Average</Text></View>
          <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: metricColor }]}>{highest.toLocaleString()}</Text><Text style={styles.summaryLabel}>Highest</Text></View>
          <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: metricColor }]}>{lowest.toLocaleString()}</Text><Text style={styles.summaryLabel}>Lowest</Text></View>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {/* Top-level view toggle */}
      <View style={styles.viewTabBar}>
        {VIEW_TABS.map((tab) => {
          const isActive = activeView === tab.key;
          return (
            <TouchableOpacity key={tab.key} style={[styles.viewTabBtn, isActive && styles.viewTabBtnActive]} onPress={() => setActiveView(tab.key)} activeOpacity={0.7}>
              <Text style={[styles.viewTabText, isActive && styles.viewTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeView === "overview" && renderOverview()}
        {activeView === "streaks" && renderStreaks()}
        {activeView === "trends" && renderTrends()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // View tab bar
  viewTabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  viewTabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  viewTabBtnActive: { backgroundColor: COLORS.primary },
  viewTabText: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary },
  viewTabTextActive: { color: COLORS.surface },

  // Period toggle (shared)
  periodToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  periodBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary },
  periodBtnTextActive: { color: COLORS.surface },

  // Date nav
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  arrowButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  dateLabel: { fontSize: 16, fontWeight: "600", color: COLORS.text },

  // Cards
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  ringContainer: { alignItems: "center", marginBottom: 16 },

  // Activity
  accentBorderExercise: { borderLeftWidth: 4, borderLeftColor: COLORS.exercise },
  accentBorderSteps: { borderLeftWidth: 4, borderLeftColor: COLORS.steps },
  accentBorderWeight: { borderLeftWidth: 4, borderLeftColor: COLORS.weight },
  activityCards: { gap: 12 },
  activityCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  activityCardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginLeft: 6 },
  activityCardValue: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  activityCardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  burnedTotal: { fontSize: 16, fontWeight: "700", color: COLORS.calories, marginLeft: "auto" },
  burnedRow: { flexDirection: "row", marginTop: 10, gap: 12 },
  burnedItem: { flex: 1, alignItems: "center" },
  burnedLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  burnedValue: { fontSize: 16, fontWeight: "700", color: COLORS.text },

  // Meals
  mealHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  mealDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  mealTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: COLORS.text },
  mealCalories: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary },
  foodItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, paddingLeft: 18, borderTopWidth: 1, borderTopColor: COLORS.border },
  foodItemName: { flex: 1, fontSize: 14, color: COLORS.text, marginRight: 8 },
  foodScoreBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
  foodScoreText: { fontSize: 11, fontWeight: "700" },
  foodItemCal: { fontSize: 13, color: COLORS.textSecondary },

  // Stats
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statItem: { width: "48%" as any, alignItems: "center", paddingVertical: 10 },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  monthlyDayRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  monthlyDayDate: { fontSize: 14, fontWeight: "500", color: COLORS.text },
  monthlyDayCal: { fontSize: 14, color: COLORS.textSecondary },

  // Loading / Empty
  loadingContainer: { paddingVertical: 60, alignItems: "center" },
  emptyContainer: { paddingVertical: 40, alignItems: "center" },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },

  // Streaks
  streakRow: { paddingRight: 16, gap: 10 },
  streakCard: { width: 110, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  streakCardActive: { borderWidth: 1, borderColor: COLORS.streak + "40" },
  streakCount: { fontSize: 28, fontWeight: "800", color: COLORS.textSecondary, marginTop: 4 },
  streakLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  streakSub: { fontSize: 12, fontWeight: "600", color: COLORS.text, marginTop: 6 },
  streakTotal: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },

  // Trends
  metricRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  metricPill: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: "center" },
  metricPillText: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  chartCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3, marginBottom: 16, overflow: "hidden" },
  chart: { borderRadius: 8, marginLeft: -8 },
  emptyChart: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  summaryValue: { fontSize: 18, fontWeight: "800" },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
});
