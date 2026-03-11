from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, Text, Float, Boolean, DateTime, Date, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    auth_token = Column(Text, nullable=True)
    token_created_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meals = relationship("Meal", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    logs = relationship("Log", back_populates="user")
    saved_meals = relationship("SavedMeal", back_populates="user")
    exercises = relationship("Exercise", back_populates="user")
    body_metrics = relationship("BodyMetric", back_populates="user")
    step_entries = relationship("StepEntry", back_populates="user")
    habits = relationship("Habit", back_populates="user")
    habit_logs = relationship("HabitLog", back_populates="user")
    todo_items = relationship("TodoItem", back_populates="user")
    notes = relationship("Note", back_populates="user")
    reminders = relationship("Reminder", back_populates="user")


class Meal(Base):
    __tablename__ = "meal"
    __table_args__ = (
        UniqueConstraint("user_id", "meal_type", "date", name="uq_user_meal_date"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    meal_type = Column(Text, nullable=False)  # breakfast / lunch / dinner / snack
    date = Column(Date, nullable=False)
    eaten_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="meals")
    foods = relationship("Food", back_populates="meal", cascade="all, delete-orphan")


class Food(Base):
    __tablename__ = "food"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meal_id = Column(Integer, ForeignKey("meal.id"), nullable=False)
    description = Column(Text, nullable=True)
    image_path = Column(Text, nullable=True)
    calories = Column(Float, default=0)
    protein = Column(Float, default=0)
    carbs = Column(Float, default=0)
    fat = Column(Float, default=0)
    fiber = Column(Float, default=0)
    sugar = Column(Float, default=0)
    sodium = Column(Float, default=0)
    analysis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meal = relationship("Meal", back_populates="foods")


class Goal(Base):
    __tablename__ = "goal"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    daily_calories = Column(Float, default=2000)
    daily_protein = Column(Float, default=50)
    daily_carbs = Column(Float, default=250)
    daily_fat = Column(Float, default=65)
    daily_steps = Column(Integer, nullable=True)
    target_weight = Column(Float, nullable=True)
    target_weight_unit = Column(Text, nullable=True)
    target_waist = Column(Float, nullable=True)
    target_waist_unit = Column(Text, nullable=True)
    target_biceps = Column(Float, nullable=True)
    target_biceps_unit = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="goals")


class FoodLibrary(Base):
    __tablename__ = "food_library"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, unique=True, nullable=False)
    aliases = Column(Text, nullable=True)  # JSON list of alternate names
    calories_per_100g = Column(Float, default=0)
    protein_per_100g = Column(Float, default=0)
    carbs_per_100g = Column(Float, default=0)
    fat_per_100g = Column(Float, default=0)
    fiber_per_100g = Column(Float, default=0)
    sugar_per_100g = Column(Float, default=0)
    sodium_per_100g = Column(Float, default=0)
    category = Column(Text, nullable=False, default="other")
    serving_size_g = Column(Float, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    action = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="logs")


class SavedMeal(Base):
    __tablename__ = "saved_meal"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="saved_meals")
    items = relationship("SavedMealItem", back_populates="saved_meal", cascade="all, delete-orphan")


class SavedMealItem(Base):
    __tablename__ = "saved_meal_item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    saved_meal_id = Column(Integer, ForeignKey("saved_meal.id"), nullable=False)
    description = Column(Text, nullable=True)
    calories = Column(Float, default=0)
    protein = Column(Float, default=0)
    carbs = Column(Float, default=0)
    fat = Column(Float, default=0)
    fiber = Column(Float, default=0)
    sugar = Column(Float, default=0)
    sodium = Column(Float, default=0)
    food_library_id = Column(Integer, ForeignKey("food_library.id"), nullable=True)
    portion_grams = Column(Float, nullable=True)

    saved_meal = relationship("SavedMeal", back_populates="items")


class Exercise(Base):
    __tablename__ = "exercise"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    exercise_type = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Float, default=0)
    calories_burned = Column(Float, default=0)
    intensity = Column(Text, default="moderate")  # low / moderate / high / vigorous
    heart_rate_avg = Column(Float, nullable=True)
    muscle_groups = Column(Text, nullable=True)  # JSON list
    notes = Column(Text, nullable=True)
    analysis = Column(Text, nullable=True)  # JSON
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="exercises")


class BodyMetric(Base):
    __tablename__ = "body_metric"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    metric_type = Column(Text, nullable=False)  # weight / waist
    value = Column(Float, nullable=False)
    unit = Column(Text, nullable=False)  # kg / lbs / cm / inches
    notes = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="body_metrics")


class StepEntry(Base):
    __tablename__ = "step_entry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    step_count = Column(Integer, nullable=False)
    source = Column(Text, default="manual")  # manual / watch_photo
    image_path = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="step_entries")


class Habit(Base):
    __tablename__ = "habit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    name = Column(Text, nullable=False)
    icon = Column(Text, default="checkmark-circle")
    color = Column(Text, default="#00D4AA")
    frequency = Column(Text, default="daily")  # daily / weekly / monthly
    frequency_target = Column(Integer, default=1)
    habit_type = Column(Text, default="boolean")  # boolean / descriptive
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="habits")
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")
    todo_items = relationship("TodoItem", back_populates="habit", cascade="all, delete-orphan")


class HabitLog(Base):
    __tablename__ = "habit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    habit_id = Column(Integer, ForeignKey("habit.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    date = Column(Date, nullable=False)
    content = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    log_type = Column(Text, default="manual")  # manual / text / voice / image
    created_at = Column(DateTime, default=datetime.utcnow)

    habit = relationship("Habit", back_populates="logs")
    user = relationship("User", back_populates="habit_logs")


class TodoItem(Base):
    __tablename__ = "todo_item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    habit_id = Column(Integer, ForeignKey("habit.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    text = Column(Text, nullable=False)
    is_done = Column(Boolean, default=False)
    done_date = Column(Date, nullable=True)
    created_date = Column(Date, nullable=False)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    habit = relationship("Habit", back_populates="todo_items")
    user = relationship("User", back_populates="todo_items")


class Note(Base):
    __tablename__ = "note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    title = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    audio_path = Column(Text, nullable=True)
    image_path = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="notes")


class Reminder(Base):
    __tablename__ = "reminder"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    todo_item_id = Column(Integer, ForeignKey("todo_item.id"), nullable=True)
    text = Column(Text, nullable=False)
    reminder_time = Column(Text, nullable=False)  # HH:MM format
    reminder_date = Column(Date, nullable=False)
    audio_path = Column(Text, nullable=True)  # path to TTS audio file
    is_triggered = Column(Boolean, default=False)
    recurrence = Column(Text, default="onetime")  # onetime, daily, weekly, biweekly, monthly
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reminders")
    triggers = relationship("ReminderTrigger", back_populates="reminder", cascade="all, delete-orphan")


class ReminderTrigger(Base):
    __tablename__ = "reminder_trigger"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reminder_id = Column(Integer, ForeignKey("reminder.id"), nullable=False)
    trigger_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    reminder = relationship("Reminder", back_populates="triggers")
