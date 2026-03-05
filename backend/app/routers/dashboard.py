from datetime import date, datetime, timedelta
import calendar

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Meal, Goal, Exercise, StepEntry, BodyMetric
from app.schemas import (
    DailySummary, WeeklySummary, MonthlySummary,
    MealResponse, GoalResponse,
    ExerciseSummary, ExerciseLogResponse,
    StepSummary, StepEntryResponse,
    BodyMetricResponse,
    CaloriesBurnedSummary,
)
from app.auth import get_current_user
from app.routers.food import _food_to_response
from app.routers.exercise import _exercise_to_response

router = APIRouter()


def _build_daily_summary(db: Session, user_id: int, target_date: date) -> DailySummary:
    meals = (
        db.query(Meal)
        .filter(Meal.user_id == user_id, Meal.date == target_date)
        .all()
    )

    meal_responses = []
    total_cal = total_prot = total_carbs = total_fat = 0.0
    total_fiber = total_sugar = total_sodium = 0.0

    for meal in meals:
        foods = [_food_to_response(f) for f in meal.foods]
        mc = sum(f.calories for f in foods)
        mp = sum(f.protein for f in foods)
        mcarbs = sum(f.carbs for f in foods)
        mf = sum(f.fat for f in foods)
        total_cal += mc
        total_prot += mp
        total_carbs += mcarbs
        total_fat += mf
        total_fiber += sum(f.fiber for f in foods)
        total_sugar += sum(f.sugar for f in foods)
        total_sodium += sum(f.sodium for f in foods)
        meal_responses.append(MealResponse(
            id=meal.id,
            meal_type=meal.meal_type,
            date=meal.date,
            foods=foods,
            total_calories=mc,
            total_protein=mp,
            total_carbs=mcarbs,
            total_fat=mf,
        ))

    goal = db.query(Goal).filter(
        Goal.user_id == user_id, Goal.is_active == True
    ).first()

    # Exercise summary
    exercises = (
        db.query(Exercise)
        .filter(Exercise.user_id == user_id, Exercise.date == target_date)
        .order_by(Exercise.created_at.desc())
        .all()
    )
    exercise_responses = [_exercise_to_response(ex) for ex in exercises]
    exercise_summary = ExerciseSummary(
        total_exercises=len(exercises),
        total_calories_burned=sum(ex.calories_burned for ex in exercises),
        total_duration_minutes=sum(ex.duration_minutes for ex in exercises),
        exercises=exercise_responses,
    )

    # Step summary
    step_entries = (
        db.query(StepEntry)
        .filter(StepEntry.user_id == user_id, StepEntry.date == target_date)
        .order_by(StepEntry.created_at.desc())
        .all()
    )
    step_entry_responses = [
        StepEntryResponse(
            id=e.id, step_count=e.step_count, source=e.source,
            image_path=e.image_path, date=e.date, created_at=e.created_at,
        )
        for e in step_entries
    ]
    step_summary = StepSummary(
        total_steps=sum(e.step_count for e in step_entries),
        entries=step_entry_responses,
    )

    # Body metrics for the day
    body_metrics_entries = (
        db.query(BodyMetric)
        .filter(BodyMetric.user_id == user_id, BodyMetric.date == target_date)
        .order_by(BodyMetric.created_at.desc())
        .all()
    )
    body_metric_responses = [
        BodyMetricResponse(
            id=bm.id, metric_type=bm.metric_type, value=bm.value,
            unit=bm.unit, notes=bm.notes, date=bm.date, created_at=bm.created_at,
        )
        for bm in body_metrics_entries
    ]

    # --- Calories burned calculation ---
    exercise_cal = sum(ex.calories_burned for ex in exercises)
    total_steps = sum(e.step_count for e in step_entries)
    step_cal = round(total_steps * 0.04, 1)

    # BMR: get latest weight from body metrics, default 70kg
    weight_kg = 70.0
    latest_weight = (
        db.query(BodyMetric)
        .filter(BodyMetric.user_id == user_id, BodyMetric.metric_type == "weight")
        .order_by(BodyMetric.date.desc(), BodyMetric.created_at.desc())
        .first()
    )
    if latest_weight:
        w = latest_weight.value
        if latest_weight.unit == "lbs":
            w = w * 0.4536
        weight_kg = w

    # Simplified Mifflin-St Jeor (assuming avg male ~175cm, ~30yr)
    daily_bmr = 10 * weight_kg + 625
    today_date = date.today()
    if target_date == today_date:
        hours_elapsed = datetime.now().hour + datetime.now().minute / 60.0
        bmr_cal = round(daily_bmr * (hours_elapsed / 24.0), 1)
    elif target_date < today_date:
        bmr_cal = round(daily_bmr, 1)
    else:
        bmr_cal = 0.0

    calories_burned = CaloriesBurnedSummary(
        exercise=round(exercise_cal, 1),
        steps=step_cal,
        bmr=bmr_cal,
        total=round(exercise_cal + step_cal + bmr_cal, 1),
    )

    return DailySummary(
        date=target_date,
        total_calories=total_cal,
        total_protein=total_prot,
        total_carbs=total_carbs,
        total_fat=total_fat,
        total_fiber=total_fiber,
        total_sugar=total_sugar,
        total_sodium=total_sodium,
        goal=GoalResponse.model_validate(goal) if goal else None,
        meals=meal_responses,
        exercise_summary=exercise_summary,
        step_summary=step_summary,
        body_metrics=body_metric_responses,
        calories_burned=calories_burned,
    )


@router.get("/daily", response_model=DailySummary)
def daily_summary(
    date_str: date = Query(alias="date", default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = date_str or date.today()
    return _build_daily_summary(db, user.id, target_date)


@router.get("/weekly", response_model=WeeklySummary)
def weekly_summary(
    date_str: date = Query(alias="date", default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = date_str or date.today()
    # Find Monday of the week
    start = target_date - timedelta(days=target_date.weekday())
    end = start + timedelta(days=6)

    days = []
    for i in range(7):
        d = start + timedelta(days=i)
        days.append(_build_daily_summary(db, user.id, d))

    days_with_data = [d for d in days if d.total_calories > 0]
    count = len(days_with_data) or 1

    return WeeklySummary(
        start_date=start,
        end_date=end,
        days=days,
        avg_calories=sum(d.total_calories for d in days_with_data) / count,
        avg_protein=sum(d.total_protein for d in days_with_data) / count,
        avg_carbs=sum(d.total_carbs for d in days_with_data) / count,
        avg_fat=sum(d.total_fat for d in days_with_data) / count,
    )


@router.get("/monthly", response_model=MonthlySummary)
def monthly_summary(
    year: int = Query(default=None),
    month: int = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    y = year or today.year
    m = month or today.month
    _, num_days = calendar.monthrange(y, m)

    days = []
    for day in range(1, num_days + 1):
        d = date(y, m, day)
        days.append(_build_daily_summary(db, user.id, d))

    days_with_data = [d for d in days if d.total_calories > 0]
    count = len(days_with_data) or 1

    return MonthlySummary(
        year=y,
        month=m,
        days=days,
        avg_calories=sum(d.total_calories for d in days_with_data) / count,
        avg_protein=sum(d.total_protein for d in days_with_data) / count,
        avg_carbs=sum(d.total_carbs for d in days_with_data) / count,
        avg_fat=sum(d.total_fat for d in days_with_data) / count,
    )
