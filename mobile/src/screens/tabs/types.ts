export interface MealData {
  id: number;
  meal_type: string;
  date: string;
  foods: any[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

export interface GoalData {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_steps?: number | null;
}

export interface ExerciseEntry {
  id: number;
  exercise_type: string;
  duration_minutes: number;
  calories_burned: number;
  intensity: string;
  description?: string;
  analysis?: { analysis?: string; recovery_advice?: string; health_benefits?: string[] } | null;
  summary?: string | null;
}

export interface ExerciseSummary {
  total_exercises: number;
  total_calories_burned: number;
  total_duration_minutes: number;
  exercises: ExerciseEntry[];
}

export interface StepSummary {
  total_steps: number;
}

export interface BodyMetricEntry {
  metric_type: string;
  value: number;
  unit: string;
}

export interface CaloriesBurned {
  exercise: number;
  steps: number;
  bmr: number;
  total: number;
}

export interface DailyData {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  goal: GoalData | null;
  meals: MealData[];
  exercise_summary?: ExerciseSummary | null;
  step_summary?: StepSummary | null;
  body_metrics?: BodyMetricEntry[] | null;
  calories_burned?: CaloriesBurned | null;
}

export interface StreakData {
  overall: { current_streak: number; total_days: number };
}

export interface HabitLogData {
  id: number;
  habit_id?: number;
  date?: string;
  content?: string | null;
  image_url?: string | null;
  log_type: string;
}

export interface HabitData {
  id: number;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  frequency_target: number;
  habit_type: string;
  is_default: boolean;
  is_active: boolean;
}

export interface TodoItemData {
  id: number;
  habit_id: number;
  text: string;
  is_done: boolean;
  done_date?: string | null;
  created_date: string;
  is_archived: boolean;
  is_carried_over: boolean;
}

export interface TodoSummary {
  total: number;
  done: number;
  pending: number;
  items: TodoItemData[];
}

export interface HabitTodayItem {
  habit: HabitData;
  completed_today: boolean;
  logs: HabitLogData[];
  todo_summary?: TodoSummary | null;
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

export interface ReminderData {
  id: number;
  text: string;
  reminder_time: string;
  reminder_date: string;
  audio_path: string | null;
  todo_item_id: number | null;
  is_triggered: boolean;
  recurrence: string;
  is_active: boolean;
  is_triggered_today: boolean;
  created_at: string;
}

export interface TabProps {
  selectedDate: Date;
  isToday: boolean;
  dateStr: string;
}
