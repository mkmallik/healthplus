import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../utils/constants";

interface GoalValues {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  steps: string;
  targetWeight: string;
  targetWeightUnit: string;
  targetWaist: string;
  targetWaistUnit: string;
  targetBiceps: string;
  targetBicepsUnit: string;
}

function UnitToggle({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: [string, string];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={unitStyles.container}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[unitStyles.option, value === opt && unitStyles.optionActive]}
          onPress={() => onChange(opt)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text
            style={[unitStyles.text, value === opt && unitStyles.textActive]}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const unitStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginLeft: 10,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
  },
  optionActive: {
    backgroundColor: COLORS.primary + "30",
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  textActive: {
    color: COLORS.primary,
  },
});

export default function GoalScreen() {
  const { logout } = useAuth();
  const [values, setValues] = useState<GoalValues>({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    steps: "",
    targetWeight: "",
    targetWeightUnit: "kg",
    targetWaist: "",
    targetWaistUnit: "cm",
    targetBiceps: "",
    targetBicepsUnit: "inches",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await client.get("/goals");
      const data = res.data;
      if (data) {
        setValues({
          calories: data.daily_calories != null ? String(data.daily_calories) : "",
          protein: data.daily_protein != null ? String(data.daily_protein) : "",
          carbs: data.daily_carbs != null ? String(data.daily_carbs) : "",
          fat: data.daily_fat != null ? String(data.daily_fat) : "",
          steps: data.daily_steps != null ? String(data.daily_steps) : "",
          targetWeight: data.target_weight != null ? String(data.target_weight) : "",
          targetWeightUnit: data.target_weight_unit || "kg",
          targetWaist: data.target_waist != null ? String(data.target_waist) : "",
          targetWaistUnit: data.target_waist_unit || "cm",
          targetBiceps: data.target_biceps != null ? String(data.target_biceps) : "",
          targetBicepsUnit: data.target_biceps_unit || "inches",
        });
      }
    } catch {
      setErrorMessage("Failed to load current goals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSave = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setSaving(true);
    try {
      await client.post("/goals", {
        daily_calories: values.calories ? Number(values.calories) : 0,
        daily_protein: values.protein ? Number(values.protein) : 0,
        daily_carbs: values.carbs ? Number(values.carbs) : 0,
        daily_fat: values.fat ? Number(values.fat) : 0,
        daily_steps: values.steps ? Number(values.steps) : null,
        target_weight: values.targetWeight ? Number(values.targetWeight) : null,
        target_weight_unit: values.targetWeight ? values.targetWeightUnit : null,
        target_waist: values.targetWaist ? Number(values.targetWaist) : null,
        target_waist_unit: values.targetWaist ? values.targetWaistUnit : null,
        target_biceps: values.targetBiceps ? Number(values.targetBiceps) : null,
        target_biceps_unit: values.targetBiceps ? values.targetBicepsUnit : null,
      });
      setSuccessMessage("Goals saved successfully!");
    } catch {
      setErrorMessage("Failed to save goals. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateValue = (field: keyof GoalValues, text: string) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setValues((prev) => ({ ...prev, [field]: text }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={100}
      enableResetScrollToCoords={false}
    >
        <Text style={styles.title}>Goals</Text>
        <Text style={styles.subtitle}>
          Set daily nutrition and activity targets, plus body metric goals.
        </Text>

        {/* Success message */}
        {successMessage && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Error message */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* ── Section 1: Daily Goals ── */}
        <Text style={styles.sectionHeader}>Daily Goals</Text>
        <View style={styles.sectionDivider} />

        {/* Calories */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Calories</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={values.calories}
              onChangeText={(text) => updateValue("calories", text)}
              keyboardType="numeric"
              placeholder="2000"
              placeholderTextColor={COLORS.border}
              editable={!saving}
            />
            <Text style={styles.unitLabel}>kcal</Text>
          </View>
        </View>

        {/* Protein */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Protein</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={values.protein}
              onChangeText={(text) => updateValue("protein", text)}
              keyboardType="numeric"
              placeholder="150"
              placeholderTextColor={COLORS.border}
              editable={!saving}
            />
            <Text style={styles.unitLabel}>g</Text>
          </View>
        </View>

        {/* Carbs */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Carbs</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={values.carbs}
              onChangeText={(text) => updateValue("carbs", text)}
              keyboardType="numeric"
              placeholder="250"
              placeholderTextColor={COLORS.border}
              editable={!saving}
            />
            <Text style={styles.unitLabel}>g</Text>
          </View>
        </View>

        {/* Fat */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Fat</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={values.fat}
              onChangeText={(text) => updateValue("fat", text)}
              keyboardType="numeric"
              placeholder="65"
              placeholderTextColor={COLORS.border}
              editable={!saving}
            />
            <Text style={styles.unitLabel}>g</Text>
          </View>
        </View>

        {/* Steps */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Steps</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={values.steps}
              onChangeText={(text) => updateValue("steps", text)}
              keyboardType="numeric"
              placeholder="10000"
              placeholderTextColor={COLORS.border}
              editable={!saving}
            />
            <Text style={styles.unitLabel}>steps</Text>
          </View>
        </View>

        {/* ── Section 2: Body Metric Targets ── */}
        <Text style={[styles.sectionHeader, { marginTop: 12 }]}>Body Metric Targets</Text>
        <View style={styles.sectionDivider} />

        {/* Target Weight */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Target Weight</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={values.targetWeight}
              onChangeText={(text) => updateValue("targetWeight", text)}
              keyboardType="numeric"
              placeholder="70"
              placeholderTextColor={COLORS.border}
              editable={!saving}
            />
            <UnitToggle
              value={values.targetWeightUnit}
              options={["kg", "lbs"]}
              onChange={(v) => updateValue("targetWeightUnit", v)}
              disabled={saving}
            />
          </View>
        </View>

        {/* Target Waist */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Target Waist</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={values.targetWaist}
              onChangeText={(text) => updateValue("targetWaist", text)}
              keyboardType="numeric"
              placeholder="32"
              placeholderTextColor={COLORS.border}
              editable={!saving}
            />
            <UnitToggle
              value={values.targetWaistUnit}
              options={["cm", "inches"]}
              onChange={(v) => updateValue("targetWaistUnit", v)}
              disabled={saving}
            />
          </View>
        </View>

        {/* Target Biceps */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Target Biceps</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={values.targetBiceps}
              onChangeText={(text) => updateValue("targetBiceps", text)}
              keyboardType="numeric"
              placeholder="14"
              placeholderTextColor={COLORS.border}
              editable={!saving}
            />
            <UnitToggle
              value={values.targetBicepsUnit}
              options={["cm", "inches"]}
              onChange={(v) => updateValue("targetBicepsUnit", v)}
              disabled={saving}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },

  // Section headers
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },

  // Messages
  successContainer: {
    backgroundColor: "#00E67615",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: COLORS.error + "15",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  // Fields
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    fontSize: 18,
    color: COLORS.text,
  },
  unitLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginLeft: 12,
    minWidth: 40,
  },

  // Save button
  saveButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "600",
  },

  // Logout
  logoutButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "600",
  },
});
