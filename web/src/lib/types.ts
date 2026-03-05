export interface User {
  id: number;
  username: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface FoodItem {
  id: number;
  meal_id: number;
  description: string | null;
  image_path: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  analysis?: FoodAnalysis | null;
  created_at: string;
}

export interface FoodAnalysis {
  food_items: string[];
  health_score: number;
  sugar_spike_risk: string;
  healthy_items: string[];
  unhealthy_items: string[];
  recommendations: string[];
  blood_sugar_impact: string;
  glycemic_index_estimate: number;
  satiety_rating: string;
  satiety_explanation: string;
  fat_loss_context: string;
  meal_timing_advice: string;
}

export interface FoodLogResponse {
  food: FoodItem;
  meal_type: string;
  transcription: string;
}

export interface MultiFoodLogResponse {
  foods: FoodItem[];
  meal_type: string;
  transcription: string;
}

export interface Meal {
  id: number;
  meal_type: string;
  date: string;
  foods: FoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

export interface GoalRequest {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_steps?: number | null;
  target_weight?: number | null;
  target_weight_unit?: string | null;
  target_waist?: number | null;
  target_waist_unit?: string | null;
  target_biceps?: number | null;
  target_biceps_unit?: string | null;
}

export interface Goal {
  id: number;
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_steps?: number | null;
  target_weight?: number | null;
  target_weight_unit?: string | null;
  target_waist?: number | null;
  target_waist_unit?: string | null;
  target_biceps?: number | null;
  target_biceps_unit?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseEntry {
  id: number;
  exercise_type: string;
  description?: string | null;
  duration_minutes: number;
  calories_burned: number;
  intensity: string;
  muscle_groups?: string[];
  analysis?: string | null;
  date: string;
  created_at: string;
  transcription?: string | null;
}

export interface ExerciseSummary {
  total_exercises: number;
  total_calories_burned: number;
  total_duration_minutes: number;
  exercises: ExerciseEntry[];
}

export interface StepEntryResponse {
  id: number;
  step_count: number;
  source: string;
  image_path?: string | null;
  date: string;
  created_at: string;
}

export interface StepSummary {
  total_steps: number;
  entries?: StepEntryResponse[];
}

export interface BodyMetricEntry {
  id: number;
  metric_type: string;
  value: number;
  unit: string;
  notes?: string | null;
  date: string;
  created_at: string;
  transcription?: string | null;
}

export interface CaloriesBurned {
  exercise: number;
  steps: number;
  bmr: number;
  total: number;
}

export interface DailySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  total_sugar: number;
  total_sodium: number;
  goal: Goal | null;
  meals: Meal[];
  exercise_summary?: ExerciseSummary | null;
  step_summary?: StepSummary | null;
  body_metrics?: BodyMetricEntry[] | null;
  calories_burned?: CaloriesBurned | null;
}

export interface WeeklySummary {
  start_date: string;
  end_date: string;
  days: DailySummary[];
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  days: DailySummary[];
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
}

export interface CategoryStreak {
  current_streak: number;
  total_days: number;
}

export interface StreaksData {
  food: CategoryStreak;
  exercise: CategoryStreak;
  steps: CategoryStreak;
  body_metrics: CategoryStreak;
  overall: CategoryStreak;
}

export interface TrendPoint {
  label: string;
  value: number | null;
}

export interface TrendsData {
  metric: string;
  period: string;
  data_points: TrendPoint[];
}

export interface Habit {
  id: number;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  frequency_target: number;
  habit_type: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface HabitLog {
  id: number;
  habit_id?: number;
  date?: string;
  content?: string | null;
  image_url?: string | null;
  log_type: string;
  created_at?: string;
}

export interface HabitTodayItem {
  habit: Habit;
  completed_today: boolean;
  logs: HabitLog[];
}

export interface HabitStreakItem {
  habit_id: number;
  name: string;
  icon: string;
  color: string;
  current_streak: number;
  longest_streak: number;
  completed_today: boolean;
}
