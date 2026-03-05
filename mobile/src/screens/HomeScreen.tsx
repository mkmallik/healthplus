import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { COLORS } from "../utils/constants";
import DateNavigator from "../components/DateNavigator";
import FoodExerciseTab from "./tabs/FoodExerciseTab";

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function HomeScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const isToday = isSameDay(selectedDate, new Date());
  const dateStr = formatDateISO(selectedDate);

  const goToPrev = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const goToNext = useCallback(() => {
    setSelectedDate((prev) => {
      if (isSameDay(prev, new Date())) return prev;
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  return (
    <View style={styles.container}>
      <DateNavigator
        selectedDate={selectedDate}
        onPrev={goToPrev}
        onNext={goToNext}
        onReset={goToToday}
        isToday={isToday}
        onDateSelect={(d) => setSelectedDate(d)}
      />
      <FoodExerciseTab selectedDate={selectedDate} isToday={isToday} dateStr={dateStr} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
