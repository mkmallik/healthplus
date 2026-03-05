import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../utils/constants";

const ACCENT = COLORS.exercise;

interface ExerciseData {
  id: number;
  exercise_type: string;
  description?: string;
  duration_minutes: number;
  calories_burned: number;
  intensity: string;
  muscle_groups?: string[];
  analysis?: {
    analysis?: string;
    recovery_advice?: string;
    health_benefits?: string[];
  };
  transcription?: string;
}

const INTENSITY_COLORS: Record<string, string> = {
  low: "#00E676",
  moderate: "#FFB74D",
  high: "#FF5252",
  vigorous: "#CE93D8",
};

export default function ExerciseReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const data: ExerciseData = route.params?.data;

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No exercise data found.</Text>
      </SafeAreaView>
    );
  }

  const intensityColor = INTENSITY_COLORS[data.intensity] || COLORS.textSecondary;
  const analysis = data.analysis;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Exercise Type Badge */}
        <View style={styles.typeBadge}>
          <Ionicons name="fitness" size={22} color={ACCENT} />
          <Text style={styles.typeBadgeText}>
            {(data.exercise_type || "exercise").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
        </View>

        {/* Stat Cards Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color={ACCENT} />
            <Text style={styles.statValue}>{Math.round(data.duration_minutes)}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={24} color="#FF5722" />
            <Text style={styles.statValue}>{Math.round(data.calories_burned)}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        {/* Intensity Badge */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Intensity</Text>
          <View style={[styles.intensityBadge, { backgroundColor: intensityColor + "20" }]}>
            <Text style={[styles.intensityText, { color: intensityColor }]}>
              {data.intensity.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Muscle Groups */}
        {data.muscle_groups && data.muscle_groups.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Muscle Groups</Text>
            <View style={styles.chipRow}>
              {data.muscle_groups.map((muscle, idx) => (
                <View key={idx} style={styles.muscleChip}>
                  <Text style={styles.muscleChipText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Analysis */}
        {analysis?.analysis ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Analysis</Text>
            <Text style={styles.analysisText}>{analysis.analysis}</Text>
          </View>
        ) : null}

        {/* Recovery Advice */}
        {analysis?.recovery_advice ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recovery Advice</Text>
            <View style={styles.adviceRow}>
              <Ionicons name="medkit-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.adviceText}>{analysis.recovery_advice}</Text>
            </View>
          </View>
        ) : null}

        {/* Health Benefits */}
        {analysis?.health_benefits && analysis.health_benefits.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Health Benefits</Text>
            {analysis.health_benefits.map((benefit, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.navigate("Home", { screen: "Today" })}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: "center",
    marginTop: 40,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: ACCENT + "15",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginBottom: 20,
  },
  typeBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: ACCENT,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  intensityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  intensityText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  muscleChip: {
    backgroundColor: ACCENT + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  muscleChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: ACCENT,
  },
  analysisText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  adviceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  adviceText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: ACCENT,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  doneButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "700",
  },
});
