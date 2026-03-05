import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import NutritionCard from "../components/NutritionCard";
import { API_URL, COLORS, getScoreColor, getSpikeColor } from "../utils/constants";
import { useToast } from "../components/Toast";

interface AnalysisItem {
  item: string;
  reason: string;
}

interface FoodAnalysis {
  food_items: string[];
  health_score: number;
  sugar_spike_risk: string;
  healthy_items: AnalysisItem[];
  unhealthy_items: AnalysisItem[];
  recommendations: string[];
  blood_sugar_impact?: string;
  glycemic_index_estimate?: string;
  satiety_rating?: number;
  satiety_explanation?: string;
  fat_loss_context?: string;
  meal_timing_advice?: string;
}

interface FoodData {
  id: number;
  description: string;
  image_path: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  analysis?: FoodAnalysis | null;
}

type FoodDetailRouteParams = {
  FoodDetail: {
    foodId: number;
    startEditing?: boolean;
  };
};

interface EditFields {
  description: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
}

export default function FoodDetailScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const route = useRoute<RouteProp<FoodDetailRouteParams, "FoodDetail">>();
  const { foodId, startEditing } = route.params;

  const [food, setFood] = useState<FoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [baseNutrition, setBaseNutrition] = useState({
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0,
  });
  const [editFields, setEditFields] = useState<EditFields>({
    description: "",
    calories: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
    fiber: "0",
    sugar: "0",
    sodium: "0",
  });

  useEffect(() => {
    const fetchFood = async () => {
      try {
        const res = await client.get(`/food/${foodId}`);
        setFood(res.data);
        if (startEditing) {
          const f = res.data;
          setEditFields({
            description: f.description || "",
            calories: String(f.calories),
            protein: String(f.protein),
            carbs: String(f.carbs),
            fat: String(f.fat),
            fiber: String(f.fiber),
            sugar: String(f.sugar),
            sodium: String(f.sodium),
          });
          setEditing(true);
        }
      } catch {
        setError("Failed to load food details.");
      } finally {
        setLoading(false);
      }
    };
    fetchFood();
  }, [foodId, startEditing]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !food) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Food not found."}</Text>
      </View>
    );
  }

  const baseUrl = API_URL.replace("/api", "");
  const imageUrl = food.image_path
    ? `${baseUrl}/uploads/${food.image_path}`
    : null;
  const analysis = food.analysis;

  const handleEdit = () => {
    const base = {
      calories: food.calories, protein: food.protein, carbs: food.carbs,
      fat: food.fat, fiber: food.fiber, sugar: food.sugar, sodium: food.sodium,
    };
    setBaseNutrition(base);
    setQuantity("1");
    setEditFields({
      description: food.description || "",
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
      fiber: String(food.fiber),
      sugar: String(food.sugar),
      sodium: String(food.sodium),
    });
    setEditing(true);
  };

  const handleDiscard = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      if (editFields.description !== (food.description || "")) {
        body.description = editFields.description;
      }
      const numericFields = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"] as const;
      for (const field of numericFields) {
        const val = parseFloat(editFields[field]);
        if (!isNaN(val) && val !== food[field]) {
          body[field] = val;
        }
      }
      if (Object.keys(body).length > 0) {
        const res = await client.put(`/food/${food.id}`, body);
        setFood(res.data);
      }
      setEditing(false);
    } catch {
      showToast("Failed to save changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (!editFields.description.trim()) {
      showToast("Enter a description to recalculate.", "info");
      return;
    }
    setRecalculating(true);
    try {
      const res = await client.put(`/food/${food.id}`, {
        description: editFields.description.trim(),
        recalculate: true,
      });
      setFood(res.data);
      const base = {
        calories: res.data.calories, protein: res.data.protein, carbs: res.data.carbs,
        fat: res.data.fat, fiber: res.data.fiber, sugar: res.data.sugar, sodium: res.data.sodium,
      };
      setBaseNutrition(base);
      setQuantity("1");
      setEditFields({
        description: res.data.description || "",
        calories: String(res.data.calories),
        protein: String(res.data.protein),
        carbs: String(res.data.carbs),
        fat: String(res.data.fat),
        fiber: String(res.data.fiber),
        sugar: String(res.data.sugar),
        sodium: String(res.data.sodium),
      });
      showToast("Nutrition recalculated!", "success");
    } catch {
      showToast("Recalculation failed.", "error");
    } finally {
      setRecalculating(false);
    }
  };

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const q = parseFloat(val);
    if (!isNaN(q) && q > 0) {
      const fields = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"] as const;
      const updated = { ...editFields };
      for (const f of fields) {
        updated[f] = String(Math.round(baseNutrition[f] * q * 10) / 10);
      }
      setEditFields(updated);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this food entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await client.delete(`/food/${food.id}`);
              navigation.goBack();
            } catch {
              showToast("Failed to delete entry.", "error");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const updateField = (field: keyof EditFields, value: string) => {
    setEditFields((prev) => ({ ...prev, [field]: value }));
  };

  const renderNutritionInput = (label: string, field: keyof EditFields, unit: string) => (
    <View style={styles.editRow} key={field}>
      <Text style={styles.editLabel}>{label}</Text>
      <View style={styles.editInputWrapper}>
        <TextInput
          style={styles.editInput}
          value={editFields[field]}
          onChangeText={(v) => updateField(field, v)}
          keyboardType="numeric"
        />
        <Text style={styles.editUnit}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {(deleting || saving || recalculating) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={100}
        enableResetScrollToCoords={false}
      >
        {/* Food image */}
        {imageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.foodImage} />
          </View>
        )}

        {/* Food description */}
        <View style={styles.section}>
          {editing ? (
            <TextInput
              style={styles.descriptionInput}
              value={editFields.description}
              onChangeText={(v) => updateField("description", v)}
              multiline
              placeholder="Description"
              placeholderTextColor={COLORS.textSecondary}
            />
          ) : (
            <Text style={styles.foodDescription}>{food.description}</Text>
          )}
        </View>

        {/* Health Analysis */}
        {analysis && !editing ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Health Analysis</Text>

            {/* Score + Sugar Spike row */}
            <View style={styles.analysisRow}>
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>Health Score</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    { color: getScoreColor(analysis.health_score) },
                  ]}
                >
                  {analysis.health_score}/10
                </Text>
              </View>
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>Sugar Spike</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    { color: getSpikeColor(analysis.sugar_spike_risk) },
                  ]}
                >
                  {analysis.sugar_spike_risk.charAt(0).toUpperCase() +
                    analysis.sugar_spike_risk.slice(1)}
                </Text>
              </View>
            </View>

            {/* Food items detected */}
            {analysis.food_items.length > 0 && (
              <View style={styles.analysisCard}>
                <Text style={styles.analysisCardTitle}>Detected Items</Text>
                <View style={styles.chipRow}>
                  {analysis.food_items.map((item, i) => (
                    <View key={i} style={styles.chip}>
                      <Text style={styles.chipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Healthy items */}
            {analysis.healthy_items.length > 0 && (
              <View style={styles.analysisCard}>
                <Text style={[styles.analysisCardTitle, { color: "#00E676" }]}>
                  Healthy
                </Text>
                {analysis.healthy_items.map((entry, i) => (
                  <View key={i} style={styles.analysisListItem}>
                    <Text style={styles.analysisItemName}>{entry.item}</Text>
                    <Text style={styles.analysisItemReason}>{entry.reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Unhealthy items */}
            {analysis.unhealthy_items.length > 0 && (
              <View style={styles.analysisCard}>
                <Text style={[styles.analysisCardTitle, { color: "#FF5252" }]}>
                  Watch Out
                </Text>
                {analysis.unhealthy_items.map((entry, i) => (
                  <View key={i} style={styles.analysisListItem}>
                    <Text style={styles.analysisItemName}>{entry.item}</Text>
                    <Text style={styles.analysisItemReason}>{entry.reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <View style={styles.analysisCard}>
                <Text style={styles.analysisCardTitle}>Recommendations</Text>
                {analysis.recommendations.map((rec, i) => (
                  <View key={i} style={styles.recommendationItem}>
                    <Text style={styles.recommendationBullet}>•</Text>
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Blood Sugar Impact */}
            {analysis.blood_sugar_impact ? (
              <View style={styles.analysisCard}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.analysisCardTitle}>Blood Sugar Impact</Text>
                  {analysis.glycemic_index_estimate ? (
                    <View style={[styles.giBadge, {
                      backgroundColor: analysis.glycemic_index_estimate === "low" ? "#00E67615" :
                        analysis.glycemic_index_estimate === "high" ? COLORS.error + "15" : COLORS.accent + "15"
                    }]}>
                      <Text style={[styles.giBadgeText, {
                        color: analysis.glycemic_index_estimate === "low" ? "#00E676" :
                          analysis.glycemic_index_estimate === "high" ? "#FF5252" : "#FFB74D"
                      }]}>
                        GI: {analysis.glycemic_index_estimate.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.analysisBodyText}>{analysis.blood_sugar_impact}</Text>
              </View>
            ) : null}

            {/* Satiety Rating */}
            {analysis.satiety_rating != null ? (
              <View style={styles.analysisCard}>
                <Text style={styles.analysisCardTitle}>Satiety Rating</Text>
                <View style={styles.satietyRow}>
                  <View style={styles.satietyBarBg}>
                    <View style={[styles.satietyBarFill, { width: `${(analysis.satiety_rating / 10) * 100}%` }]} />
                  </View>
                  <Text style={styles.satietyValue}>{analysis.satiety_rating}/10</Text>
                </View>
                {analysis.satiety_explanation ? (
                  <Text style={styles.analysisBodyText}>{analysis.satiety_explanation}</Text>
                ) : null}
              </View>
            ) : null}

            {/* Fat Loss Tips */}
            {analysis.fat_loss_context ? (
              <View style={styles.analysisCard}>
                <Text style={[styles.analysisCardTitle, { color: "#FF4081" }]}>Fat Loss Tips</Text>
                <Text style={styles.analysisBodyText}>{analysis.fat_loss_context}</Text>
              </View>
            ) : null}

            {/* Meal Timing Advice */}
            {analysis.meal_timing_advice ? (
              <View style={styles.analysisCard}>
                <Text style={[styles.analysisCardTitle, { color: "#7C4DFF" }]}>Meal Timing</Text>
                <Text style={styles.analysisBodyText}>{analysis.meal_timing_advice}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Nutrition info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nutrition Facts</Text>
          {editing ? (
            <View style={styles.editCard}>
              <View style={styles.editRow}>
                <Text style={[styles.editLabel, { fontWeight: "700" }]}>Quantity</Text>
                <View style={styles.editInputWrapper}>
                  <TextInput
                    style={[styles.editInput, { borderColor: COLORS.accent }]}
                    value={quantity}
                    onChangeText={handleQuantityChange}
                    keyboardType="numeric"
                  />
                  <Text style={styles.editUnit}>x</Text>
                </View>
              </View>
              {renderNutritionInput("Calories", "calories", "kcal")}
              {renderNutritionInput("Protein", "protein", "g")}
              {renderNutritionInput("Carbs", "carbs", "g")}
              {renderNutritionInput("Fat", "fat", "g")}
              {renderNutritionInput("Fiber", "fiber", "g")}
              {renderNutritionInput("Sugar", "sugar", "g")}
              {renderNutritionInput("Sodium", "sodium", "mg")}
            </View>
          ) : (
            <NutritionCard
              calories={food.calories}
              protein={food.protein}
              carbs={food.carbs}
              fat={food.fat}
              fiber={food.fiber}
              sugar={food.sugar}
              sodium={food.sodium}
            />
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {editing ? (
          <View style={styles.bottomCol}>
            <TouchableOpacity
              style={[styles.recalcButton, recalculating && styles.buttonDisabled]}
              onPress={handleRecalculate}
              activeOpacity={0.8}
              disabled={recalculating}
            >
              <Ionicons name="sparkles" size={18} color={COLORS.accent} />
              <Text style={styles.recalcButtonText}>
                {recalculating ? "Recalculating..." : "Recalculate with AI"}
              </Text>
            </TouchableOpacity>
            <View style={styles.bottomRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDiscard}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Text style={styles.dangerButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },

  // Image
  imageContainer: {
    width: "100%",
    height: 260,
    backgroundColor: "#000",
  },
  foodImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  foodDescription: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 28,
  },

  // Description edit
  descriptionInput: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 12,
    minHeight: 56,
    textAlignVertical: "top",
  },

  // Health Analysis
  analysisRow: {
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
  analysisCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  analysisCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  analysisListItem: {
    marginBottom: 8,
  },
  analysisItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  analysisItemReason: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  recommendationItem: {
    flexDirection: "row",
    marginBottom: 6,
    paddingRight: 8,
  },
  recommendationBullet: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "700",
    marginRight: 8,
    lineHeight: 20,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
  analysisBodyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
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

  // Edit mode
  editCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  editLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  editInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  editInput: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 80,
    textAlign: "right",
  },
  editUnit: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
    width: 30,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomCol: {
    gap: 10,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 10,
  },
  recalcButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.accent + "15",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent + "40",
  },
  recalcButtonText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  dangerButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  dangerButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
