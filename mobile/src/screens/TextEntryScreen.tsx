import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useNavigation } from "@react-navigation/native";
import client from "../api/client";
import { COLORS, MEAL_LABELS } from "../utils/constants";

const MEAL_TYPES = ["auto", "breakfast", "lunch", "dinner", "snack"];

export default function TextEntryScreen() {
  const navigation = useNavigation<any>();
  const [description, setDescription] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("auto");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!description.trim()) {
      setError("Please describe what you ate.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("description", description.trim());
      if (selectedMealType !== "auto") {
        formData.append("meal_type", selectedMealType);
      }

      const response = await client.post("/food/log-text", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigation.navigate("Review", { data: response.data });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        "Failed to analyze food. Please try again.";
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={100}
          enableResetScrollToCoords={false}
        >
          <Text style={styles.title}>Type Your Food</Text>
          <Text style={styles.hint}>
            Describe what you ate with portions for best accuracy.
          </Text>

          <TextInput
            style={styles.input}
            placeholder={'e.g. "2 scrambled eggs, 1 slice whole wheat toast with butter, black coffee"'}
            placeholderTextColor={COLORS.textSecondary}
            value={description}
            onChangeText={(v) => {
              setDescription(v);
              setError(null);
            }}
            multiline
            maxLength={500}
            textAlignVertical="top"
            autoFocus
          />

          <Text style={styles.charCount}>{description.length}/500</Text>

          {/* Meal type chips */}
          <Text style={styles.chipLabel}>Meal Type</Text>
          <View style={styles.chipRow}>
            {MEAL_TYPES.map((mt) => (
              <TouchableOpacity
                key={mt}
                style={[
                  styles.chip,
                  selectedMealType === mt && styles.chipActive,
                ]}
                onPress={() => setSelectedMealType(mt)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedMealType === mt && styles.chipTextActive,
                  ]}
                >
                  {mt === "auto" ? "Auto" : MEAL_LABELS[mt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </KeyboardAwareScrollView>

        {/* Analyze button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              (analyzing || !description.trim()) && styles.buttonDisabled,
            ]}
            onPress={handleAnalyze}
            disabled={analyzing || !description.trim()}
            activeOpacity={0.8}
          >
            {analyzing ? (
              <View style={styles.analyzingRow}>
                <ActivityIndicator color={COLORS.surface} size="small" />
                <Text style={styles.analyzeButtonText}>  Analyzing...</Text>
              </View>
            ) : (
              <Text style={styles.analyzeButtonText}>Analyze</Text>
            )}
          </TouchableOpacity>
        </View>
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
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    maxHeight: 200,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 4,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primaryDark,
  },
  errorBox: {
    marginTop: 16,
    backgroundColor: COLORS.error + "15",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  analyzeButton: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "700",
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
