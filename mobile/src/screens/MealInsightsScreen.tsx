import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS, MEAL_LABELS, getScoreColor, getSpikeColor } from "../utils/constants";
import { useToast } from "../components/Toast";

interface MealInsights {
  meal_id: number;
  meal_type: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  total_sugar: number;
  total_sodium: number;
  food_count: number;
  food_names: string[];
  health_score: number;
  sugar_spike_risk: string;
  blood_sugar_impact: string;
  glycemic_index_estimate: string;
  satiety_rating: number;
  satiety_explanation: string;
  fat_loss_context: string;
  meal_timing_advice: string;
  macro_balance: string;
  food_synergies: string[];
  recommendations: string[];
  overall_verdict: string;
}

type RouteParams = {
  MealInsights: { mealId: number; mealType: string };
};

export default function MealInsightsScreen() {
  const route = useRoute<RouteProp<RouteParams, "MealInsights">>();
  const { mealId, mealType } = route.params;
  const { showToast } = useToast();
  const [data, setData] = useState<MealInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await client.get(`/meals/${mealId}/insights`);
        setData(res.data);
      } catch {
        setError("Failed to load meal insights.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [mealId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analyzing your meal...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "No data available."}</Text>
      </View>
    );
  }

  const mealLabel = MEAL_LABELS[mealType] || mealType;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>{mealLabel} Insights</Text>
      <Text style={styles.subtitle}>
        {data.food_count} items  |  {Math.round(data.total_calories)} kcal
      </Text>

      {/* Food items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items in this meal</Text>
        {data.food_names.map((name, i) => (
          <Text key={i} style={styles.foodName}>•  {name}</Text>
        ))}
      </View>

      {/* Overall Verdict */}
      {data.overall_verdict ? (
        <View style={[styles.card, styles.verdictCard]}>
          <Text style={styles.cardTitle}>Overall Verdict</Text>
          <Text style={styles.bodyText}>{data.overall_verdict}</Text>
        </View>
      ) : null}

      {/* Score Cards Row */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Health Score</Text>
          <Text style={[styles.scoreValue, { color: getScoreColor(data.health_score) }]}>
            {data.health_score}/10
          </Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Sugar Spike</Text>
          <Text style={[styles.scoreValue, { color: getSpikeColor(data.sugar_spike_risk) }]}>
            {data.sugar_spike_risk.charAt(0).toUpperCase() + data.sugar_spike_risk.slice(1)}
          </Text>
        </View>
      </View>

      {/* Nutrition Totals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nutrition Totals</Text>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutriCol}>
            <Text style={styles.nutriValue}>{Math.round(data.total_calories)}</Text>
            <Text style={styles.nutriLabel}>kcal</Text>
          </View>
          <View style={styles.nutriCol}>
            <Text style={[styles.nutriValue, { color: COLORS.protein }]}>{Math.round(data.total_protein)}g</Text>
            <Text style={styles.nutriLabel}>Protein</Text>
          </View>
          <View style={styles.nutriCol}>
            <Text style={[styles.nutriValue, { color: COLORS.carbs }]}>{Math.round(data.total_carbs)}g</Text>
            <Text style={styles.nutriLabel}>Carbs</Text>
          </View>
          <View style={styles.nutriCol}>
            <Text style={[styles.nutriValue, { color: COLORS.fat }]}>{Math.round(data.total_fat)}g</Text>
            <Text style={styles.nutriLabel}>Fat</Text>
          </View>
        </View>
        <View style={styles.microRow}>
          <Text style={styles.microText}>Fiber: {Math.round(data.total_fiber)}g</Text>
          <Text style={styles.microText}>Sugar: {Math.round(data.total_sugar)}g</Text>
          <Text style={styles.microText}>Sodium: {Math.round(data.total_sodium)}mg</Text>
        </View>
      </View>

      {/* Macro Balance */}
      {data.macro_balance ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macro Balance</Text>
          <Text style={styles.bodyText}>{data.macro_balance}</Text>
        </View>
      ) : null}

      {/* Blood Sugar Impact */}
      {data.blood_sugar_impact ? (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Blood Sugar Impact</Text>
            <View style={[styles.giBadge, {
              backgroundColor: data.glycemic_index_estimate === "low" ? "#00E67615" :
                data.glycemic_index_estimate === "high" ? COLORS.error + "15" : COLORS.accent + "15"
            }]}>
              <Text style={[styles.giBadgeText, {
                color: data.glycemic_index_estimate === "low" ? "#00E676" :
                  data.glycemic_index_estimate === "high" ? "#FF5252" : "#FFB74D"
              }]}>
                GI: {data.glycemic_index_estimate.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.bodyText}>{data.blood_sugar_impact}</Text>
        </View>
      ) : null}

      {/* Satiety */}
      {data.satiety_rating != null ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Satiety Rating</Text>
          <View style={styles.satietyRow}>
            <View style={styles.satietyBarBg}>
              <View style={[styles.satietyBarFill, { width: `${(data.satiety_rating / 10) * 100}%` }]} />
            </View>
            <Text style={styles.satietyValue}>{data.satiety_rating}/10</Text>
          </View>
          {data.satiety_explanation ? (
            <Text style={styles.bodyText}>{data.satiety_explanation}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Fat Loss */}
      {data.fat_loss_context ? (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: "#FF4081" }]}>Fat Loss Context</Text>
          <Text style={styles.bodyText}>{data.fat_loss_context}</Text>
        </View>
      ) : null}

      {/* Meal Timing */}
      {data.meal_timing_advice ? (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: "#7C4DFF" }]}>Meal Timing</Text>
          <Text style={styles.bodyText}>{data.meal_timing_advice}</Text>
        </View>
      ) : null}

      {/* Food Synergies */}
      {data.food_synergies && data.food_synergies.length > 0 ? (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: "#26C6DA" }]}>Food Synergies</Text>
          {data.food_synergies.map((s, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 ? (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: COLORS.primary }]}>Recommendations</Text>
          {data.recommendations.map((r, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={[styles.bullet, { color: COLORS.primary }]}>{i + 1}.</Text>
              <Text style={styles.bulletText}>{r}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Save as Meal Template */}
      <TouchableOpacity
        style={styles.saveTemplateButton}
        onPress={() => {
          Alert.prompt(
            "Save as Meal Template",
            "Enter a name for this saved meal:",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Save",
                onPress: async (name?: string) => {
                  if (!name || !name.trim()) return;
                  try {
                    await client.post(
                      `/saved-meals/from-meal/${mealId}?name=${encodeURIComponent(name.trim())}`
                    );
                    showToast(`"${name.trim()}" saved as a meal template.`, "success");
                  } catch {
                    showToast("Failed to save meal template.", "error");
                  }
                },
              },
            ],
            "plain-text",
            `${mealLabel} meal`
          );
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="bookmark-outline" size={20} color={COLORS.surface} />
        <Text style={styles.saveTemplateText}>Save as Meal Template</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  verdictCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
  },
  foodName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  scoreRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  nutriCol: {
    alignItems: "center",
  },
  nutriValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  nutriLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  microRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  microText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  giBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  giBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  satietyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  satietyBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  satietyBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  satietyValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 6,
    paddingRight: 8,
  },
  bullet: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginRight: 8,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
  },
  saveTemplateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  saveTemplateText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: "700",
  },
});
