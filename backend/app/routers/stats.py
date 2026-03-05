from datetime import date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Meal, Food, Exercise, StepEntry, BodyMetric
from app.auth import get_current_user

router = APIRouter()


# --- Schemas ---

class CategoryStreak(BaseModel):
    current_streak: int = 0
    total_days: int = 0


class StreaksResponse(BaseModel):
    food: CategoryStreak
    exercise: CategoryStreak
    steps: CategoryStreak
    body_metrics: CategoryStreak
    overall: CategoryStreak


class TrendPoint(BaseModel):
    label: str
    value: Optional[float] = None


class TrendsResponse(BaseModel):
    metric: str
    period: str
    data_points: List[TrendPoint] = []


# --- Helpers ---

def _compute_streak(active_dates: set, today: date) -> int:
    """Walk backward from today counting consecutive days."""
    streak = 0
    d = today
    while d in active_dates:
        streak += 1
        d -= timedelta(days=1)
    return streak


def _get_food_dates(db: Session, user_id: int) -> set:
    rows = (
        db.query(distinct(Meal.date))
        .join(Food, Food.meal_id == Meal.id)
        .filter(Meal.user_id == user_id)
        .all()
    )
    return {r[0] for r in rows}


def _get_exercise_dates(db: Session, user_id: int) -> set:
    rows = (
        db.query(distinct(Exercise.date))
        .filter(Exercise.user_id == user_id)
        .all()
    )
    dates = {r[0] for r in rows}
    # Also include days where steps >= 5000
    step_rows = (
        db.query(StepEntry.date, func.sum(StepEntry.step_count))
        .filter(StepEntry.user_id == user_id)
        .group_by(StepEntry.date)
        .having(func.sum(StepEntry.step_count) >= 5000)
        .all()
    )
    dates |= {r[0] for r in step_rows}
    return dates


def _get_step_dates(db: Session, user_id: int) -> set:
    rows = (
        db.query(distinct(StepEntry.date))
        .filter(StepEntry.user_id == user_id)
        .all()
    )
    return {r[0] for r in rows}


def _get_body_metric_dates(db: Session, user_id: int) -> set:
    rows = (
        db.query(distinct(BodyMetric.date))
        .filter(BodyMetric.user_id == user_id)
        .all()
    )
    return {r[0] for r in rows}


# --- Endpoints ---

@router.get("/streaks", response_model=StreaksResponse)
def get_streaks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()

    food_dates = _get_food_dates(db, user.id)
    exercise_dates = _get_exercise_dates(db, user.id)
    step_dates = _get_step_dates(db, user.id)
    bm_dates = _get_body_metric_dates(db, user.id)
    overall_dates = food_dates | exercise_dates | step_dates | bm_dates

    return StreaksResponse(
        food=CategoryStreak(
            current_streak=_compute_streak(food_dates, today),
            total_days=len(food_dates),
        ),
        exercise=CategoryStreak(
            current_streak=_compute_streak(exercise_dates, today),
            total_days=len(exercise_dates),
        ),
        steps=CategoryStreak(
            current_streak=_compute_streak(step_dates, today),
            total_days=len(step_dates),
        ),
        body_metrics=CategoryStreak(
            current_streak=_compute_streak(bm_dates, today),
            total_days=len(bm_dates),
        ),
        overall=CategoryStreak(
            current_streak=_compute_streak(overall_dates, today),
            total_days=len(overall_dates),
        ),
    )


@router.get("/trends", response_model=TrendsResponse)
def get_trends(
    metric: str = Query(default="calories"),
    period: str = Query(default="week"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()

    if period == "week":
        num_days = 7
    elif period == "month":
        num_days = 30
    elif period == "year":
        num_days = 365
    else:
        num_days = 7

    start_date = today - timedelta(days=num_days - 1)

    if period == "year":
        # Aggregate by week (~52 points)
        data_points = _get_yearly_trends(db, user.id, metric, start_date, today)
    else:
        data_points = _get_daily_trends(db, user.id, metric, start_date, today)

    return TrendsResponse(metric=metric, period=period, data_points=data_points)


def _get_daily_trends(
    db: Session, user_id: int, metric: str, start: date, end: date
) -> List[TrendPoint]:
    """Return one data point per day."""
    day_count = (end - start).days + 1
    dates = [start + timedelta(days=i) for i in range(day_count)]

    if metric == "calories":
        raw = _query_calories_by_date(db, user_id, start, end)
    elif metric == "steps":
        raw = _query_steps_by_date(db, user_id, start, end)
    elif metric == "exercise":
        raw = _query_exercise_by_date(db, user_id, start, end)
    elif metric == "weight":
        raw = _query_weight_by_date(db, user_id, start, end)
    else:
        raw = {}

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    points = []
    for d in dates:
        label = f"{months[d.month - 1]} {d.day}"
        value = raw.get(d)
        points.append(TrendPoint(label=label, value=value))
    return points


def _get_yearly_trends(
    db: Session, user_id: int, metric: str, start: date, end: date
) -> List[TrendPoint]:
    """Aggregate by ISO week for ~52 points."""
    # Build week buckets
    weeks = []
    current = start
    while current <= end:
        week_end = min(current + timedelta(days=6), end)
        weeks.append((current, week_end))
        current = week_end + timedelta(days=1)

    if metric == "calories":
        raw = _query_calories_by_date(db, user_id, start, end)
    elif metric == "steps":
        raw = _query_steps_by_date(db, user_id, start, end)
    elif metric == "exercise":
        raw = _query_exercise_by_date(db, user_id, start, end)
    elif metric == "weight":
        raw = _query_weight_by_date(db, user_id, start, end)
    else:
        raw = {}

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    points = []
    for ws, we in weeks:
        label = f"{months[ws.month - 1]} {ws.day}"
        if metric == "weight":
            # For weight, take the latest non-null value in the week
            values = [raw[d] for d in _date_range(ws, we) if raw.get(d) is not None]
            value = values[-1] if values else None
        else:
            # Sum the week for calories/steps/exercise
            values = [raw.get(d, 0) or 0 for d in _date_range(ws, we)]
            total = sum(values)
            value = round(total, 1) if total > 0 else 0
        points.append(TrendPoint(label=label, value=value))
    return points


def _date_range(start: date, end: date) -> List[date]:
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]


# --- Query helpers ---

def _query_calories_by_date(db: Session, user_id: int, start: date, end: date) -> dict:
    rows = (
        db.query(Meal.date, func.sum(Food.calories))
        .join(Food, Food.meal_id == Meal.id)
        .filter(Meal.user_id == user_id, Meal.date >= start, Meal.date <= end)
        .group_by(Meal.date)
        .all()
    )
    return {r[0]: round(r[1], 1) if r[1] else 0 for r in rows}


def _query_steps_by_date(db: Session, user_id: int, start: date, end: date) -> dict:
    rows = (
        db.query(StepEntry.date, func.sum(StepEntry.step_count))
        .filter(StepEntry.user_id == user_id, StepEntry.date >= start, StepEntry.date <= end)
        .group_by(StepEntry.date)
        .all()
    )
    return {r[0]: r[1] if r[1] else 0 for r in rows}


def _query_exercise_by_date(db: Session, user_id: int, start: date, end: date) -> dict:
    rows = (
        db.query(Exercise.date, func.sum(Exercise.calories_burned))
        .filter(Exercise.user_id == user_id, Exercise.date >= start, Exercise.date <= end)
        .group_by(Exercise.date)
        .all()
    )
    return {r[0]: round(r[1], 1) if r[1] else 0 for r in rows}


def _query_weight_by_date(db: Session, user_id: int, start: date, end: date) -> dict:
    """Get the latest weight entry per day. Missing days → None."""
    rows = (
        db.query(BodyMetric.date, BodyMetric.value)
        .filter(
            BodyMetric.user_id == user_id,
            BodyMetric.metric_type == "weight",
            BodyMetric.date >= start,
            BodyMetric.date <= end,
        )
        .order_by(BodyMetric.date, BodyMetric.created_at.desc())
        .all()
    )
    # Keep latest per day (first row per date due to desc ordering)
    result = {}
    for r in rows:
        if r[0] not in result:
            result[r[0]] = r[1]
    return result
