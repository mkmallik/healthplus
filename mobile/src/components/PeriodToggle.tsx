import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../utils/constants";

export type Period = "day" | "7days" | "30days" | "all";

interface PeriodToggleProps {
  period: Period;
  onChange: (period: Period) => void;
}

const OPTIONS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "7days", label: "7 Days" },
  { value: "30days", label: "30 Days" },
  { value: "all", label: "All" },
];

export default function PeriodToggle({ period, onChange }: PeriodToggleProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const active = period === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    padding: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.surface,
  },
});
