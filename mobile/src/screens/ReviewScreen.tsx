import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import NutritionCard from "../components/NutritionCard";
import { API_URL, COLORS, MEAL_LABELS, getScoreColor, getSpikeColor } from "../utils/constants";
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
}

interface FoodData {
  id: number;
  description: string;
  image_path: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  analysis?: FoodAnalysis | null;
}

interface ReviewData {
  food?: FoodData;
  foods?: FoodData[];
  meal_type: string;
  transcription?: string;
}

type ReviewRouteParams = {
  Review: {
    data: ReviewData;
  };
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: COLORS.breakfast,
  lunch: COLORS.lunch,
  dinner: COLORS.dinner,
  snack: COLORS.snack,
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

export default function ReviewScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const route = useRoute<RouteProp<ReviewRouteParams, "Review">>();
  const { data } = route.params;
  const { meal_type, transcription } = data;

  // Support both single food (legacy) and multi-food responses
  const foodsList: FoodData[] = data.foods && data.foods.length > 0
    ? data.foods
    : data.food
    ? [data.food]
    : [];

  const isMulti = foodsList.length > 1;
  const firstFood = foodsList[0] || null;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [currentFood, setCurrentFood] = useState(firstFood);
  const [quantity, setQuantity] = useState("1");
  const [baseNutrition, setBaseNutrition] = useState({
    calories: firstFood?.calories ?? 0,
    protein: firstFood?.protein ?? 0,
    carbs: firstFood?.carbs ?? 0,
    fat: firstFood?.fat ?? 0,
    fiber: firstFood?.fiber ?? 0,
    sugar: firstFood?.sugar ?? 0,
    sodium: firstFood?.sodium ?? 0,
  });
  const [editFields, setEditFields] = useState<EditFields>({
    description: firstFood?.description || "",
    calories: String(firstFood?.calories ?? 0),
    protein: String(firstFood?.protein ?? 0),
    carbs: String(firstFood?.carbs ?? 0),
    fat: String(firstFood?.fat ?? 0),
    fiber: String(firstFood?.fiber ?? 0),
    sugar: String(firstFood?.sugar ?? 0),
    sodium: String(firstFood?.sodium ?? 0),
  });

  const food = currentFood;
  const analysis = food?.analysis ?? null;

  const baseUrl = API_URL.replace("/api", "");
  const imageUrl = food?.image_path ? `${baseUrl}/uploads/${food.image_path}` : "";

  const mealLabel = MEAL_LABELS[meal_type] || meal_type;
  const mealColor = MEAL_COLORS[meal_type] || COLORS.primary;

  // Totals for multi-food
  const totalCalories = foodsList.reduce((s, f) => s + f.calories, 0);

  const handleDone = () => {
    navigation.navigate("Home");
  };

  const handleEdit = () => {
    const base = {
      calories: currentFood.calories,
      protein: currentFood.protein,
      carbs: currentFood.carbs,
      fat: currentFood.fat,
      fiber: currentFood.fiber,
      sugar: currentFood.sugar,
      sodium: currentFood.sodium,
    };
    setBaseNutrition(base);
    setQuantity("1");
    setEditFields({
      description: currentFood.description || "",
      calories: String(currentFood.calories),
      protein: String(currentFood.protein),
      carbs: String(currentFood.carbs),
      fat: String(currentFood.fat),
      fiber: String(currentFood.fiber),
      sugar: String(currentFood.sugar),
      sodium: String(currentFood.sodium),
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
      if (editFields.description !== (currentFood?.description || "")) {
        body.description = editFields.description;
      }
      const numericFields = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"] as const;
      for (const field of numericFields) {
        const val = parseFloat(editFields[field]);
        if (!isNaN(val) && currentFood && val !== currentFood[field]) {
          body[field] = val;
        }
      }
      if (Object.keys(body).length > 0 && currentFood) {
        const res = await client.put(`/food/${currentFood.id}`, body);
        setCurrentFood(res.data);
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
      const res = await client.put(`/food/${currentFood.id}`, {
        description: editFields.description.trim(),
        recalculate: true,
      });
      setCurrentFood(res.data);
      const base = {
        calories: res.data.calories,
        protein: res.data.protein,
        carbs: res.data.carbs,
        fat: res.data.fat,
        fiber: res.data.fiber,
        sugar: res.data.sugar,
        sodium: res.data.sodium,
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

  const handleCancelEntry = () => {
    Alert.alert(
      "Cancel Entry",
      isMulti
        ? `Delete all ${foodsList.length} food entries and go back?`
        : "Delete this food entry and go back?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              for (const f of foodsList) {
                await client.delete(`/food/${f.id}`);
              }
              navigation.navigate("Home");
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
        {/* Food image or placeholder */}
        <View style={styles.imageContainer}>
          {currentFood.image_path ? (
            <Image source={{ uri: imageUrl }} style={styles.foodImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="restaurant-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.placeholderText}>No photo</Text>
            </View>
          )}
          <View style={[styles.mealBadge, { backgroundColor: mealColor }]}>
            <Text style={styles.mealBadgeText}>{mealLabel}</Text>
          </View>
        </View>

        {/* Multi-food summary */}
        {isMulti && !editing && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {foodsList.length} Items Logged ({Math.round(totalCalories)} kcal total)
            </Text>
            {foodsList.map((f, idx) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.multiFoodItem,
                  currentFood?.id === f.id && { borderColor: COLORS.primary, borderWidth: 2 },
                ]}
                onPress={() => {
                  setCurrentFood(f);
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
                }}
                activeOpacity={0.7}
              >
                <View style={styles.multiFoodLeft}>
                  <Text style={styles.multiFoodIdx}>{idx + 1}</Text>
                  <Text style={styles.multiFoodName} numberOfLines={1}>{f.description}</Text>
                </View>
                <Text style={styles.multiFoodCal}>{Math.round(f.calories)} kcal</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Food description */}
        {food ? (
        <>
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
            <Text style={styles.foodDescription}>{currentFood?.description}</Text>
          )}
        </View>

        {/* Transcription */}
        {transcription && !editing ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Voice Description</Text>
            <View style={styles.transcriptionBox}>
              <Text style={styles.transcriptionText}>{transcription}</Text>
            </View>
          </View>
        ) : null}

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
                <Text style={styles.scoreLabel}>Sugar Spike Risk</Text>
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
              calories={currentFood?.calories ?? 0}
              protein={currentFood?.protein ?? 0}
              carbs={currentFood?.carbs ?? 0}
              fat={currentFood?.fat ?? 0}
              fiber={currentFood?.fiber ?? 0}
              sugar={currentFood?.sugar ?? 0}
              sodium={currentFood?.sodium ?? 0}
            />
          )}
        </View>
        </>
        ) : null}
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
              onPress={handleCancelEntry}
              activeOpacity={0.8}
            >
              <Text style={styles.dangerButtonText}>Cancel Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
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
    position: "relative",
  },
  foodImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  mealBadge: {
    position: "absolute",
    bottom: 12,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mealBadgeText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
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

  // Transcription
  transcriptionBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  transcriptionText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    fontStyle: "italic",
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
  // Multi-food
  multiFoodItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  multiFoodLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  multiFoodIdx: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary + "20",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginRight: 10,
    overflow: "hidden",
  },
  multiFoodName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  multiFoodCal: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
});
