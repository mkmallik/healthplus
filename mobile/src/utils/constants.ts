export const API_URL = "https://ht.copperdigital.net/api";

export const COLORS = {
  primary: "#00D4AA",
  primaryDark: "#00A388",
  primaryLight: "#00D4AA25",
  accent: "#FF7043",
  background: "#0D1117",
  surface: "#1A1F2E",
  error: "#FF4757",
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  border: "#2D2D44",
  breakfast: "#FFB74D",
  lunch: "#66BB6A",
  dinner: "#42A5F5",
  snack: "#CE93D8",
  calories: "#FF8A65",
  protein: "#64B5F6",
  carbs: "#FFD54F",
  fat: "#FF6B6B",
  exercise: "#FF6090",
  steps: "#4DD0E1",
  weight: "#BCAAA4",
  waist: "#B0BEC5",
  biceps: "#B388FF",
  streak: "#FF6E40",
  streakInactive: "#4A4A5A",
};

export function getScoreColor(score: number): string {
  if (score >= 8) return "#00E676";
  if (score >= 5) return "#FFB74D";
  return "#FF5252";
}

export function getSpikeColor(risk: string): string {
  if (risk === "low") return "#00E676";
  if (risk === "moderate") return "#FFB74D";
  return "#FF5252";
}

export const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export const EXERCISE_TYPES: Record<string, string> = {
  badminton: "Badminton",
  weight_training: "Weight Training",
  walking: "Walking",
  running: "Running",
  cycling: "Cycling",
  swimming: "Swimming",
  yoga: "Yoga",
  other: "Other",
};

export const METRIC_LABELS: Record<string, string> = {
  weight: "Weight",
  waist: "Waist",
  biceps: "Biceps",
};
