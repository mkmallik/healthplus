import os
from contextlib import asynccontextmanager

from sqlalchemy import text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.routers import auth, food, meals, goals, dashboard, food_library, saved_meals, exercise, steps, body_metrics, stats, habits, notes, voice_log, reminders


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Auto-migrate: add analysis column to food table if missing
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(food)"))
        columns = [row[1] for row in result]
        if "analysis" not in columns:
            conn.execute(text("ALTER TABLE food ADD COLUMN analysis TEXT"))
            conn.commit()

    # Auto-migrate: add eaten_at column to meal table if missing
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(meal)"))
        meal_columns = [row[1] for row in result]
        if "eaten_at" not in meal_columns:
            conn.execute(text("ALTER TABLE meal ADD COLUMN eaten_at DATETIME"))
            conn.commit()

    # Auto-migrate: add new goal columns if missing
    new_goal_columns = {
        "daily_steps": "INTEGER",
        "target_weight": "REAL",
        "target_weight_unit": "TEXT",
        "target_waist": "REAL",
        "target_waist_unit": "TEXT",
        "target_biceps": "REAL",
        "target_biceps_unit": "TEXT",
    }
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(goal)"))
        existing_cols = {row[1] for row in result}
        for col_name, col_type in new_goal_columns.items():
            if col_name not in existing_cols:
                conn.execute(text(f"ALTER TABLE goal ADD COLUMN {col_name} {col_type}"))
        conn.commit()

    # Auto-migrate: add descriptive habit columns if missing
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(habit)"))
        habit_cols = {row[1] for row in result}
        if "habit_type" not in habit_cols:
            conn.execute(text("ALTER TABLE habit ADD COLUMN habit_type TEXT DEFAULT 'boolean'"))
            conn.commit()

    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(habit_log)"))
        hlog_cols = {row[1] for row in result}
        new_hlog_cols = {
            "content": "TEXT",
            "image_url": "TEXT",
            "log_type": "TEXT DEFAULT 'manual'",
        }
        for col_name, col_type in new_hlog_cols.items():
            if col_name not in hlog_cols:
                conn.execute(text(f"ALTER TABLE habit_log ADD COLUMN {col_name} {col_type}"))
        conn.commit()

    # Auto-migrate: add recurrence columns to reminder if missing
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(reminder)"))
        reminder_cols = {row[1] for row in result}
        new_reminder_cols = {
            "recurrence": "TEXT DEFAULT 'onetime'",
            "is_active": "BOOLEAN DEFAULT 1",
        }
        for col_name, col_type in new_reminder_cols.items():
            if col_name not in reminder_cols:
                conn.execute(text(f"ALTER TABLE reminder ADD COLUMN {col_name} {col_type}"))
        conn.commit()

    # Ensure all tables exist (exercise, body_metric, step_entry, etc.)
    Base.metadata.create_all(bind=engine)

    yield


app = FastAPI(title="HealthPlus API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(food.router, prefix="/api/food", tags=["food"])
app.include_router(meals.router, prefix="/api/meals", tags=["meals"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(food_library.router, prefix="/api/food-library", tags=["food-library"])
app.include_router(saved_meals.router, prefix="/api/saved-meals", tags=["saved-meals"])
app.include_router(exercise.router, prefix="/api/exercise", tags=["exercise"])
app.include_router(steps.router, prefix="/api/steps", tags=["steps"])
app.include_router(body_metrics.router, prefix="/api/body-metrics", tags=["body-metrics"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(habits.router, prefix="/api/habits", tags=["habits"])
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(voice_log.router, prefix="/api/voice-log", tags=["voice-log"])
app.include_router(reminders.router, prefix="/api/reminders", tags=["reminders"])


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
