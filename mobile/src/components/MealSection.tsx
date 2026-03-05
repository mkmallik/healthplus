import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  FlatList,
  Modal,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, MEAL_LABELS, API_URL, getScoreColor } from "../utils/constants";

interface FoodAnalysis {
  health_score: number;
  sugar_spike_risk: string;
  food_items?: string[];
  healthy_items?: { item: string; reason: string }[];
  unhealthy_items?: { item: string; reason: string }[];
  recommendations?: string[];
}

interface FoodItem {
  id: number;
  description: string;
  image_path?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  analysis?: FoodAnalysis | null;
}

interface MealSectionProps {
  mealType: string;
  mealId?: number;
  foods: FoodItem[];
  totalCalories: number;
  onDeleteFood?: (foodId: number) => void;
  onMoveFood?: (foodId: number, targetMealType: string) => void;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: "\u2600\uFE0F",
  lunch: "\uD83C\uDF1E",
  dinner: "\uD83C\uDF19",
  snack: "\uD83C\uDF6A",
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

interface ActionOption {
  label: string;
  icon: string;
  color?: string;
  destructive?: boolean;
  onPress: () => void;
}

const MealSection: React.FC<MealSectionProps> = ({
  mealType,
  mealId,
  foods,
  totalCalories,
  onDeleteFood,
  onMoveFood,
}) => {
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  const mealColor =
    (COLORS as Record<string, string>)[mealType] || COLORS.primary;
  const mealLabel = MEAL_LABELS[mealType] || mealType;
  const mealIcon = MEAL_ICONS[mealType] || "\uD83C\uDF7D\uFE0F";

  const baseUrl = API_URL.replace("/api", "");

  const handlePress = (item: FoodItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const getActions = (item: FoodItem): ActionOption[] => {
    const moveTargets = MEAL_TYPES.filter((t) => t !== mealType);
    const actions: ActionOption[] = [
      {
        label: "View Details",
        icon: "eye-outline",
        onPress: () => {
          closeModal();
          navigation.navigate("FoodDetail", { foodId: item.id });
        },
      },
      {
        label: "Edit",
        icon: "create-outline",
        onPress: () => {
          closeModal();
          navigation.navigate("FoodDetail", { foodId: item.id, startEditing: true });
        },
      },
      ...moveTargets.map((t) => ({
        label: `Move to ${MEAL_LABELS[t] || t}`,
        icon: "swap-horizontal-outline",
        onPress: () => {
          closeModal();
          onMoveFood?.(item.id, t);
        },
      })),
      {
        label: "Delete",
        icon: "trash-outline",
        color: COLORS.error,
        destructive: true,
        onPress: () => {
          closeModal();
          Alert.alert("Delete", "Are you sure you want to delete this entry?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => onDeleteFood?.(item.id) },
          ]);
        },
      },
    ];
    return actions;
  };

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <TouchableOpacity
      style={styles.foodItem}
      activeOpacity={0.7}
      onPress={() => handlePress(item)}
    >
      {item.image_path ? (
        <Image
          source={{ uri: `${baseUrl}/uploads/${item.image_path}` }}
          style={styles.foodThumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.foodThumbnailPlaceholder, { backgroundColor: mealColor + "20" }]}>
          <Text style={styles.placeholderText}>{mealIcon}</Text>
        </View>
      )}
      <View style={styles.foodInfo}>
        <Text style={styles.foodDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.foodMeta}>
          <Text style={styles.foodMacros}>
            P: {Math.round(item.protein)}g | C: {Math.round(item.carbs)}g | F:{" "}
            {Math.round(item.fat)}g
          </Text>
          {item.analysis && (
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: getScoreColor(item.analysis.health_score) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.scoreBadgeText,
                  { color: getScoreColor(item.analysis.health_score) },
                ]}
              >
                {item.analysis.health_score}/10
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.foodCalories}>{Math.round(item.calories)} kcal</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View
            style={[styles.mealIndicator, { backgroundColor: mealColor }]}
          />
          <Text style={styles.mealIcon}>{mealIcon}</Text>
          <Text style={styles.mealLabel}>{mealLabel}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.totalCalories}>
            {Math.round(totalCalories)} kcal
          </Text>
          <Text style={styles.expandIcon}>{expanded ? "\u25B2" : "\u25BC"}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.foodList}>
          {foods.length > 0 ? (
            <>
              <FlatList
                data={foods}
                renderItem={renderFoodItem}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
              {mealId != null && (
                <TouchableOpacity
                  style={styles.insightsButton}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("MealInsights", { mealId, mealType })}
                >
                  <Text style={styles.insightsButtonText}>View Meal Insights</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No foods logged</Text>
          )}
        </View>
      )}

      {/* Custom action sheet modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {/* Header with title and X button */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedItem?.description || "Food Item"}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={closeModal}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Calorie info */}
                {selectedItem && (
                  <Text style={styles.modalSubtitle}>
                    {Math.round(selectedItem.calories)} kcal  ·  P: {Math.round(selectedItem.protein)}g  C: {Math.round(selectedItem.carbs)}g  F: {Math.round(selectedItem.fat)}g
                  </Text>
                )}

                {/* Action buttons */}
                <View style={styles.modalActions}>
                  {selectedItem && getActions(selectedItem).map((action, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.modalActionRow,
                        idx < getActions(selectedItem).length - 1 && styles.modalActionBorder,
                      ]}
                      onPress={action.onPress}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={action.icon as any}
                        size={20}
                        color={action.color || COLORS.text}
                      />
                      <Text
                        style={[
                          styles.modalActionText,
                          action.color ? { color: action.color } : null,
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 10,
  },
  mealIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  mealLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalCalories: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  expandIcon: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  foodList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  foodItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  foodThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  foodThumbnailPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 20,
  },
  foodInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  foodDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  foodMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 8,
  },
  foodMacros: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  insightsButton: {
    marginTop: 10,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  insightsButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginRight: 12,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  modalActions: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modalActionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
    marginLeft: 12,
  },
});

export default MealSection;
