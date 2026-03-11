export const COLORS = {
  primary: "#22c55e",
  primaryDark: "#16a34a",
  primaryLight: "rgba(34,197,94,0.15)",
  accent: "#FF9800",
  background: "#0a0a0a",
  surface: "#141414",
  surface2: "#1a1a1a",
  error: "#ef4444",
  text: "#f4f4f5",
  textSecondary: "#a1a1aa",
  border: "#27272a",
  breakfast: "#FF9800",
  lunch: "#4CAF50",
  dinner: "#2196F3",
  snack: "#9C27B0",
  calories: "#FF5722",
  protein: "#2196F3",
  carbs: "#FF9800",
  fat: "#F44336",
  exercise: "#E91E63",
  steps: "#00ACC1",
  weight: "#795548",
  waist: "#78909C",
  biceps: "#673AB7",
  streak: "#FF5722",
  streakInactive: "#52525b",
} as const;

export const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export const EXERCISE_TYPES = [
  { key: "badminton", label: "Badminton", icon: "🏸" },
  { key: "weight_training", label: "Weights", icon: "🏋️" },
  { key: "walking", label: "Walking", icon: "🚶" },
  { key: "running", label: "Running", icon: "🏃" },
  { key: "cycling", label: "Cycling", icon: "🚴" },
  { key: "swimming", label: "Swimming", icon: "🏊" },
  { key: "yoga", label: "Yoga", icon: "🧘" },
  { key: "other", label: "Other", icon: "⚡" },
];

export const METRIC_LABELS: Record<string, string> = {
  weight: "Weight",
  waist: "Waist",
  biceps: "Biceps",
};

export const METRIC_COLORS: Record<string, string> = {
  weight: COLORS.weight,
  waist: COLORS.waist,
  biceps: COLORS.biceps,
};

export const INTENSITY_COLORS: Record<string, string> = {
  low: "#66BB6A",
  moderate: "#FFA726",
  high: "#EF5350",
  very_high: "#D32F2F",
};

export const HABIT_ICONS = [
  "checkmark-circle", "water", "bed", "book",
  "leaf", "heart", "barbell", "bicycle",
  "walk", "medkit", "moon", "sunny",
];

export const HABIT_COLORS = [
  "#4CAF50", "#2196F3", "#FF9800", "#E91E63",
  "#9C27B0", "#00BCD4", "#FF5722", "#795548",
  "#607D8B", "#673AB7",
];
