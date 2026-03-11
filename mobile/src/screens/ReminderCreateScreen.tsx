import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../utils/constants";
import { useToast } from "../components/Toast";

const RECURRENCE_OPTIONS = [
  { key: "onetime", label: "Once" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Bi-weekly" },
  { key: "monthly", label: "Monthly" },
];

export default function ReminderCreateScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const dateStr = route.params?.dateStr || new Date().toISOString().split("T")[0];

  const [text, setText] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [recurrence, setRecurrence] = useState("onetime");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) {
      showToast("Enter reminder text", "error");
      return;
    }
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      showToast("Enter a valid time (00:00 - 23:59)", "error");
      return;
    }
    const reminderTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    setSaving(true);
    try {
      await client.post("/reminders", {
        text: text.trim(),
        reminder_time: reminderTime,
        reminder_date: dateStr,
        recurrence,
      });
      showToast(`Reminder set for ${reminderTime}`, "success");
      navigation.goBack();
    } catch {
      showToast("Failed to create reminder", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>What should I remind you?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Take medicine, Drink water..."
            placeholderTextColor={COLORS.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Time</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeInput}
              placeholder="HH"
              placeholderTextColor={COLORS.textSecondary}
              value={hours}
              onChangeText={(v) => setHours(v.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.timeSeparator}>:</Text>
            <TextInput
              style={styles.timeInput}
              placeholder="MM"
              placeholderTextColor={COLORS.textSecondary}
              value={minutes}
              onChangeText={(v) => setMinutes(v.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Repeat</Text>
          <View style={styles.recurrenceRow}>
            {RECURRENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.recurrencePill,
                  recurrence === opt.key && styles.recurrencePillActive,
                ]}
                onPress={() => setRecurrence(opt.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.recurrencePillText,
                    recurrence === opt.key && styles.recurrencePillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!text.trim() || saving) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!text.trim() || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="alarm" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Set Reminder</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    width: 80,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  recurrenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recurrencePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  recurrencePillActive: {
    backgroundColor: "#FF7043",
    borderColor: "#FF7043",
  },
  recurrencePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  recurrencePillTextActive: {
    color: "#FFF",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF7043",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
