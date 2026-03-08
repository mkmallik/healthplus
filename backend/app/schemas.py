from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel


# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    username: str
    name: str

    class Config:
        from_attributes = True


# --- Food Analysis ---
class AnalysisItem(BaseModel):
    item: str
    reason: str


class FoodAnalysis(BaseModel):
    food_items: List[str] = []
    health_score: int = 5
    sugar_spike_risk: str = "moderate"
    healthy_items: List[AnalysisItem] = []
    unhealthy_items: List[AnalysisItem] = []
    recommendations: List[str] = []
    blood_sugar_impact: str = ""
    glycemic_index_estimate: str = "medium"
    satiety_rating: int = 5
    satiety_explanation: str = ""
    fat_loss_context: str = ""
    meal_timing_advice: str = ""


# --- Food ---
class FoodResponse(BaseModel):
    id: int
    meal_id: int
    description: Optional[str] = None
    image_path: Optional[str] = None
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    sugar: float
    sodium: float
    analysis: Optional[FoodAnalysis] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FoodUpdateRequest(BaseModel):
    description: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fiber: Optional[float] = None
    sugar: Optional[float] = None
    sodium: Optional[float] = None
    recalculate: Optional[bool] = None


class FoodLogResponse(BaseModel):
    food: FoodResponse
    meal_type: str
    transcription: str


class MultiFoodLogResponse(BaseModel):
    foods: List[FoodResponse]
    meal_type: str
    transcription: str


# --- Meal ---
class MealResponse(BaseModel):
    id: int
    meal_type: str
    date: date
    foods: List[FoodResponse] = []
    total_calories: float = 0
    total_protein: float = 0
    total_carbs: float = 0
    total_fat: float = 0

    class Config:
        from_attributes = True


# --- Goal ---
class GoalRequest(BaseModel):
    daily_calories: float = 2000
    daily_protein: float = 50
    daily_carbs: float = 250
    daily_fat: float = 65
    daily_steps: Optional[int] = None
    target_weight: Optional[float] = None
    target_weight_unit: Optional[str] = None
    target_waist: Optional[float] = None
    target_waist_unit: Optional[str] = None
    target_biceps: Optional[float] = None
    target_biceps_unit: Optional[str] = None


class GoalResponse(BaseModel):
    id: int
    daily_calories: float
    daily_protein: float
    daily_carbs: float
    daily_fat: float
    daily_steps: Optional[int] = None
    target_weight: Optional[float] = None
    target_weight_unit: Optional[str] = None
    target_waist: Optional[float] = None
    target_waist_unit: Optional[str] = None
    target_biceps: Optional[float] = None
    target_biceps_unit: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Calories Burned ---
class CaloriesBurnedSummary(BaseModel):
    exercise: float = 0
    steps: float = 0
    bmr: float = 0
    total: float = 0


# --- Dashboard ---
class DailySummary(BaseModel):
    date: date
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    total_fiber: float
    total_sugar: float
    total_sodium: float
    goal: Optional[GoalResponse] = None
    meals: List[MealResponse] = []
    exercise_summary: Optional["ExerciseSummary"] = None
    step_summary: Optional["StepSummary"] = None
    body_metrics: Optional[List["BodyMetricResponse"]] = None
    calories_burned: Optional[CaloriesBurnedSummary] = None


class WeeklySummary(BaseModel):
    start_date: date
    end_date: date
    days: List[DailySummary] = []
    avg_calories: float = 0
    avg_protein: float = 0
    avg_carbs: float = 0
    avg_fat: float = 0


class MonthlySummary(BaseModel):
    year: int
    month: int
    days: List[DailySummary] = []
    avg_calories: float = 0
    avg_protein: float = 0
    avg_carbs: float = 0
    avg_fat: float = 0


# --- Meal Insights ---
class MealInsightsResponse(BaseModel):
    meal_id: int
    meal_type: str
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    total_fiber: float
    total_sugar: float
    total_sodium: float
    food_count: int
    food_names: List[str]
    health_score: int = 5
    sugar_spike_risk: str = "moderate"
    blood_sugar_impact: str = ""
    glycemic_index_estimate: str = "medium"
    satiety_rating: int = 5
    satiety_explanation: str = ""
    fat_loss_context: str = ""
    meal_timing_advice: str = ""
    macro_balance: str = ""
    food_synergies: List[str] = []
    recommendations: List[str] = []
    overall_verdict: str = ""


# --- Food Library ---
class FoodLibraryResponse(BaseModel):
    id: int
    name: str
    aliases: Optional[List[str]] = None
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    fiber_per_100g: float
    sugar_per_100g: float
    sodium_per_100g: float
    category: str
    serving_size_g: float

    class Config:
        from_attributes = True


class QuickLogRequest(BaseModel):
    food_library_id: int
    portion_grams: float = 100
    meal_type: str = "snack"


# --- Saved Meals ---
class SavedMealItemCreate(BaseModel):
    description: Optional[str] = None
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    food_library_id: Optional[int] = None
    portion_grams: Optional[float] = None


class SavedMealItemResponse(BaseModel):
    id: int
    description: Optional[str] = None
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    sugar: float
    sodium: float
    food_library_id: Optional[int] = None
    portion_grams: Optional[float] = None

    class Config:
        from_attributes = True


class SavedMealCreate(BaseModel):
    name: str
    items: List[SavedMealItemCreate]


class SavedMealResponse(BaseModel):
    id: int
    name: str
    items: List[SavedMealItemResponse] = []
    total_calories: float = 0
    total_protein: float = 0
    total_carbs: float = 0
    total_fat: float = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RelogRequest(BaseModel):
    food_id: int
    meal_type: str = "snack"


class RelogSavedMealRequest(BaseModel):
    meal_type: str = "snack"


# --- Exercise ---
class ExerciseLogResponse(BaseModel):
    id: int
    exercise_type: str
    description: Optional[str] = None
    duration_minutes: float = 0
    calories_burned: float = 0
    intensity: str = "moderate"
    muscle_groups: Optional[List[str]] = None
    analysis: Optional[dict] = None
    summary: Optional[str] = None
    date: date
    created_at: datetime
    transcription: str = ""

    class Config:
        from_attributes = True


class ExerciseSummary(BaseModel):
    total_exercises: int = 0
    total_calories_burned: float = 0
    total_duration_minutes: float = 0
    exercises: List[ExerciseLogResponse] = []


# --- Body Metrics ---
class BodyMetricResponse(BaseModel):
    id: int
    metric_type: str
    value: float
    unit: str
    notes: Optional[str] = None
    date: date
    created_at: datetime
    transcription: str = ""

    class Config:
        from_attributes = True


class BodyMetricHistory(BaseModel):
    metric_type: str
    entries: List[BodyMetricResponse] = []
    latest_value: Optional[float] = None
    change_from_previous: Optional[float] = None


# --- Steps ---
class StepEntryResponse(BaseModel):
    id: int
    step_count: int
    source: str = "manual"
    image_path: Optional[str] = None
    date: date
    created_at: datetime

    class Config:
        from_attributes = True


class StepSummary(BaseModel):
    total_steps: int = 0
    entries: List[StepEntryResponse] = []


# --- Habits ---
class HabitCreateRequest(BaseModel):
    name: str
    icon: str = "checkmark-circle"
    color: str = "#00D4AA"
    frequency: str = "daily"
    frequency_target: int = 1
    habit_type: str = "boolean"


class HabitUpdateRequest(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    frequency: Optional[str] = None
    frequency_target: Optional[int] = None
    habit_type: Optional[str] = None


class HabitResponse(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    frequency: str
    frequency_target: int
    habit_type: str = "boolean"
    is_default: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class HabitLogResponse(BaseModel):
    id: int
    habit_id: int
    date: date
    content: Optional[str] = None
    image_url: Optional[str] = None
    log_type: str = "manual"
    created_at: datetime

    class Config:
        from_attributes = True


# --- Todo Items ---
class TodoItemCreateRequest(BaseModel):
    text: str
    created_date: Optional[str] = None


class TodoItemUpdateRequest(BaseModel):
    text: Optional[str] = None
    is_done: Optional[bool] = None


class TodoItemResponse(BaseModel):
    id: int
    habit_id: int
    text: str
    is_done: bool
    done_date: Optional[date] = None
    created_date: date
    is_archived: bool
    is_carried_over: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class TodoSummary(BaseModel):
    total: int = 0
    done: int = 0
    pending: int = 0
    items: List[TodoItemResponse] = []


class HabitTodayItem(BaseModel):
    habit: HabitResponse
    completed_today: bool
    logs: List[HabitLogResponse] = []
    todo_summary: Optional[TodoSummary] = None


class HabitLogEntry(BaseModel):
    habit: HabitResponse
    log: HabitLogResponse


class HabitLogDateGroup(BaseModel):
    date: str
    entries: List[HabitLogEntry] = []
    unlogged: List[HabitResponse] = []


class HabitStreakItem(BaseModel):
    habit_id: int
    name: str
    icon: str
    color: str
    current_streak: int
    longest_streak: int
    completed_today: bool


# --- Notes ---
class NoteCreateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    note_date: Optional[str] = None


class NoteUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    title: Optional[str] = None
    content: Optional[str] = None
    date: date
    audio_path: Optional[str] = None
    image_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Reminders ---
class ReminderCreateRequest(BaseModel):
    text: str
    reminder_time: str  # HH:MM format
    reminder_date: Optional[str] = None
    todo_item_id: Optional[int] = None


class ReminderResponse(BaseModel):
    id: int
    text: str
    reminder_time: str
    reminder_date: date
    audio_path: Optional[str] = None
    todo_item_id: Optional[int] = None
    is_triggered: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Voice Log ---
class VoiceLogResponse(BaseModel):
    category: str
    message: str
    data: Optional[dict] = None
