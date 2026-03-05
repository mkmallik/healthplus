import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { COLORS } from "../utils/constants";

interface DayData {
  date: string;
  calories: number;
}

interface WeeklyChartProps {
  days: DayData[];
  goal: number;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WeeklyChart: React.FC<WeeklyChartProps> = ({ days, goal }) => {
  const screenWidth = Dimensions.get("window").width - 32;

  const labels =
    days.length > 0
      ? days.map((day) => {
          const date = new Date(day.date);
          return DAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1];
        })
      : DAY_LABELS;

  const data = days.length > 0 ? days.map((day) => day.calories) : new Array(7).fill(0);

  const chartData = {
    labels,
    datasets: [
      {
        data,
      },
      {
        // Goal line represented as a constant dataset
        data: new Array(data.length).fill(goal),
        withDots: false,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: COLORS.surface,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 212, 170, ${opacity})`,
    labelColor: () => COLORS.textSecondary,
    barPercentage: 0.6,
    propsForBackgroundLines: {
      strokeDasharray: "4 4",
      stroke: COLORS.border,
      strokeWidth: 1,
    },
    fillShadowGradientOpacity: 1,
    fillShadowGradient: COLORS.primary,
  };

  const maxCalories = Math.max(...data, goal);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Overview</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: COLORS.primary }]}
            />
            <Text style={styles.legendText}>Calories</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendLine} />
            <Text style={styles.legendText}>Goal ({goal})</Text>
          </View>
        </View>
      </View>

      <BarChart
        data={chartData}
        width={screenWidth}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={chartConfig}
        style={styles.chart}
        fromZero
        showValuesOnTopOfBars
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendLine: {
    width: 16,
    height: 2,
    backgroundColor: COLORS.error,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  chart: {
    borderRadius: 8,
    marginLeft: -16,
  },
});

export default WeeklyChart;
