import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../utils/constants";

interface NutritionCardProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

const NutritionCard: React.FC<NutritionCardProps> = ({
  calories,
  protein,
  carbs,
  fat,
  fiber,
  sugar,
  sodium,
}) => {
  return (
    <View style={styles.card}>
      {/* Calories at the top */}
      <View style={styles.caloriesContainer}>
        <Text style={styles.caloriesValue}>{Math.round(calories)}</Text>
        <Text style={styles.caloriesLabel}>Calories</Text>
      </View>

      {/* Macro row */}
      <View style={styles.macroRow}>
        <View style={styles.macroItem}>
          <View
            style={[styles.macroIndicator, { backgroundColor: COLORS.protein }]}
          />
          <Text style={styles.macroValue}>{Math.round(protein)}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroItem}>
          <View
            style={[styles.macroIndicator, { backgroundColor: COLORS.carbs }]}
          />
          <Text style={styles.macroValue}>{Math.round(carbs)}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>
        <View style={styles.macroItem}>
          <View
            style={[styles.macroIndicator, { backgroundColor: COLORS.fat }]}
          />
          <Text style={styles.macroValue}>{Math.round(fat)}g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Secondary nutrients */}
      <View style={styles.secondaryRow}>
        <View style={styles.secondaryItem}>
          <Text style={styles.secondaryLabel}>Fiber</Text>
          <Text style={styles.secondaryValue}>{Math.round(fiber)}g</Text>
        </View>
        <View style={styles.secondaryItem}>
          <Text style={styles.secondaryLabel}>Sugar</Text>
          <Text style={styles.secondaryValue}>{Math.round(sugar)}g</Text>
        </View>
        <View style={styles.secondaryItem}>
          <Text style={styles.secondaryLabel}>Sodium</Text>
          <Text style={styles.secondaryValue}>{Math.round(sodium)}mg</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  caloriesContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  caloriesValue: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.calories,
  },
  caloriesLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  macroItem: {
    alignItems: "center",
  },
  macroIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  macroLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  secondaryItem: {
    alignItems: "center",
  },
  secondaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  secondaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    marginTop: 2,
  },
});

export default NutritionCard;
