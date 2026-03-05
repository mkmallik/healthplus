import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { COLORS } from "../utils/constants";

interface DateNavigatorProps {
  selectedDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  isToday: boolean;
  onDateSelect?: (date: Date) => void;
}

function formatLabel(date: Date, isToday: boolean): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isToday) {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `Today, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DateNavigator({
  selectedDate,
  onPrev,
  onNext,
  onReset,
  isToday,
  onDateSelect,
}: DateNavigatorProps) {
  const [calendarVisible, setCalendarVisible] = useState(false);
  const label = formatLabel(selectedDate, isToday);
  const todayStr = formatDateISO(new Date());
  const selectedStr = formatDateISO(selectedDate);

  const handleLabelPress = () => {
    if (onDateSelect) {
      setCalendarVisible(true);
    } else if (!isToday) {
      onReset();
    }
  };

  const handleDayPress = (day: { dateString: string }) => {
    const parts = day.dateString.split("-");
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (onDateSelect) {
      onDateSelect(d);
    }
    setCalendarVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPrev} style={styles.arrowButton} activeOpacity={0.6}>
        <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleLabelPress}
        activeOpacity={0.6}
        style={styles.labelContainer}
      >
        <Text style={[styles.label, (onDateSelect || !isToday) && styles.labelTappable]}>{label}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={isToday ? undefined : onNext}
        style={[styles.arrowButton, isToday && styles.arrowDisabled]}
        activeOpacity={isToday ? 1 : 0.6}
        disabled={isToday}
      >
        <Ionicons name="chevron-forward" size={22} color={isToday ? COLORS.border : COLORS.primary} />
      </TouchableOpacity>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setCalendarVisible(false)}>
          <Pressable style={styles.calendarContainer} onPress={() => {}}>
            <Calendar
              current={selectedStr}
              maxDate={todayStr}
              markedDates={{
                [selectedStr]: { selected: true, selectedColor: COLORS.primary },
              }}
              onDayPress={handleDayPress}
              theme={{
                backgroundColor: COLORS.surface,
                calendarBackground: COLORS.surface,
                textSectionTitleColor: COLORS.textSecondary,
                dayTextColor: COLORS.text,
                todayTextColor: COLORS.primary,
                selectedDayTextColor: COLORS.surface,
                monthTextColor: COLORS.text,
                arrowColor: COLORS.primary,
                textDisabledColor: COLORS.border,
                textMonthFontWeight: "700",
                textDayFontWeight: "500",
                textDayHeaderFontWeight: "600",
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: {
    opacity: 0.4,
  },
  labelContainer: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  labelTappable: {
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarContainer: {
    width: "90%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
});
