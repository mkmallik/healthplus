"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";

interface GoalValues {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  steps: string;
  target_weight: string;
  target_weight_unit: string;
  target_waist: string;
  target_waist_unit: string;
  target_biceps: string;
  target_biceps_unit: string;
}

const DAILY_FIELDS = [
  { key: "calories" as const, label: "Calories", unit: "kcal", placeholder: "2000", apiKey: "daily_calories" },
  { key: "protein" as const, label: "Protein", unit: "g", placeholder: "150", apiKey: "daily_protein" },
  { key: "carbs" as const, label: "Carbs", unit: "g", placeholder: "250", apiKey: "daily_carbs" },
  { key: "fat" as const, label: "Fat", unit: "g", placeholder: "65", apiKey: "daily_fat" },
  { key: "steps" as const, label: "Steps", unit: "steps", placeholder: "10000", apiKey: "daily_steps" },
];

const BODY_METRIC_FIELDS = [
  { key: "target_weight" as const, unitKey: "target_weight_unit" as const, label: "Weight", units: ["kg", "lbs"] },
  { key: "target_waist" as const, unitKey: "target_waist_unit" as const, label: "Waist", units: ["cm", "inches"] },
  { key: "target_biceps" as const, unitKey: "target_biceps_unit" as const, label: "Biceps", units: ["cm", "inches"] },
];

export default function GoalsPage() {
  const { showToast } = useToast();
  const [values, setValues] = useState<GoalValues>({
    calories: "", protein: "", carbs: "", fat: "", steps: "",
    target_weight: "", target_weight_unit: "kg",
    target_waist: "", target_waist_unit: "cm",
    target_biceps: "", target_biceps_unit: "cm",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/goals");
      const data = res.data;
      if (data) {
        setValues({
          calories: data.daily_calories != null ? String(data.daily_calories) : "",
          protein: data.daily_protein != null ? String(data.daily_protein) : "",
          carbs: data.daily_carbs != null ? String(data.daily_carbs) : "",
          fat: data.daily_fat != null ? String(data.daily_fat) : "",
          steps: data.daily_steps != null ? String(data.daily_steps) : "",
          target_weight: data.target_weight != null ? String(data.target_weight) : "",
          target_weight_unit: data.target_weight_unit || "kg",
          target_waist: data.target_waist != null ? String(data.target_waist) : "",
          target_waist_unit: data.target_waist_unit || "cm",
          target_biceps: data.target_biceps != null ? String(data.target_biceps) : "",
          target_biceps_unit: data.target_biceps_unit || "cm",
        });
      }
    } catch {
      showToast("Failed to load goals.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        daily_calories: values.calories ? Number(values.calories) : 0,
        daily_protein: values.protein ? Number(values.protein) : 0,
        daily_carbs: values.carbs ? Number(values.carbs) : 0,
        daily_fat: values.fat ? Number(values.fat) : 0,
      };
      if (values.steps) payload.daily_steps = Number(values.steps);
      if (values.target_weight) {
        payload.target_weight = Number(values.target_weight);
        payload.target_weight_unit = values.target_weight_unit;
      }
      if (values.target_waist) {
        payload.target_waist = Number(values.target_waist);
        payload.target_waist_unit = values.target_waist_unit;
      }
      if (values.target_biceps) {
        payload.target_biceps = Number(values.target_biceps);
        payload.target_biceps_unit = values.target_biceps_unit;
      }

      await api.post("/goals", payload);
      showToast("Goals saved successfully!", "success");
    } catch {
      showToast("Failed to save goals.", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateValue = (field: keyof GoalValues, text: string) => {
    setValues((prev) => ({ ...prev, [field]: text }));
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-lg p-4 md:p-6">
      <h1 className="text-2xl font-bold text-text mb-2">Goals</h1>
      <p className="text-sm text-text-secondary mb-6">
        Set your daily targets and body metric goals.
      </p>

      {/* Daily Goals */}
      <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">Daily Goals</h2>
      <div className="rounded-xl bg-surface p-5 shadow-sm mb-6">
        {DAILY_FIELDS.map((field) => (
          <div key={field.key} className="mb-5 last:mb-0">
            <label className="mb-1.5 block text-sm font-semibold text-text">
              {field.label}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={values[field.key]}
                onChange={(e) => updateValue(field.key, e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-base text-text outline-none transition-colors focus:border-primary"
                placeholder={field.placeholder}
                disabled={saving}
              />
              <span className="text-sm font-medium text-text-secondary min-w-[40px]">
                {field.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Body Metric Targets */}
      <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">Body Metric Targets</h2>
      <div className="rounded-xl bg-surface p-5 shadow-sm mb-6">
        {BODY_METRIC_FIELDS.map((field) => (
          <div key={field.key} className="mb-5 last:mb-0">
            <label className="mb-1.5 block text-sm font-semibold text-text">
              Target {field.label}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={values[field.key]}
                onChange={(e) => updateValue(field.key, e.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-base text-text outline-none transition-colors focus:border-primary"
                placeholder="0"
                disabled={saving}
              />
              <div className="flex rounded-lg border border-border overflow-hidden">
                {field.units.map((u) => (
                  <button
                    key={u}
                    onClick={() => updateValue(field.unitKey, u)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      values[field.unitKey] === u
                        ? "bg-primary text-white"
                        : "bg-surface text-text-secondary hover:bg-surface-2"
                    }`}
                    disabled={saving}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Goals"}
      </button>
    </div>
  );
}
