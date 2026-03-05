import os
import uuid
from datetime import date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Habit, HabitLog, Meal, Food, Exercise, StepEntry, BodyMetric, TodoItem
from app.schemas import (
    HabitResponse, HabitCreateRequest, HabitUpdateRequest,
    HabitTodayItem, HabitStreakItem, HabitLogResponse,
    HabitLogEntry, HabitLogDateGroup,
    TodoItemCreateRequest, TodoItemUpdateRequest, TodoItemResponse, TodoSummary,
)
from app.auth import get_current_user
from app.services.openai_service import transcribe_audio, describe_habit_image

router = APIRouter()

# Default habits that auto-complete based on other logged data
_DEFAULT_HABITS = [
    {"name": "Log Food", "icon": "restaurant", "color": "#FFB74D"},
    {"name": "Log Weight", "icon": "scale-outline", "color": "#A1887F"},
    {"name": "Log Steps", "icon": "footsteps", "color": "#26C6DA"},
    {"name": "Exercise", "icon": "fitness", "color": "#FF4081"},
]


def _ensure_defaults(db: Session, user_id: int) -> None:
    """Create default habits for user if none exist."""
    existing = db.query(Habit).filter(Habit.user_id == user_id).count()
    if existing > 0:
        return
    for h in _DEFAULT_HABITS:
        habit = Habit(
            user_id=user_id,
            name=h["name"],
            icon=h["icon"],
            color=h["color"],
            frequency="daily",
            frequency_target=1,
            is_default=True,
            is_active=True,
        )
        db.add(habit)
    db.commit()


def _check_auto_completion(db: Session, user_id: int, habit: Habit, target_date: date) -> bool:
    """For default habits, check if the corresponding action was logged on the given date."""
    if not habit.is_default:
        return False

    name_lower = habit.name.lower()
    if "food" in name_lower:
        count = (
            db.query(Food.id)
            .join(Meal)
            .filter(Meal.user_id == user_id, Meal.date == target_date)
            .count()
        )
        return count > 0
    elif "weight" in name_lower:
        count = (
            db.query(BodyMetric.id)
            .filter(
                BodyMetric.user_id == user_id,
                BodyMetric.date == target_date,
                BodyMetric.metric_type == "weight",
            )
            .count()
        )
        return count > 0
    elif "step" in name_lower:
        count = (
            db.query(StepEntry.id)
            .filter(StepEntry.user_id == user_id, StepEntry.date == target_date)
            .count()
        )
        return count > 0
    elif "exercise" in name_lower:
        count = (
            db.query(Exercise.id)
            .filter(Exercise.user_id == user_id, Exercise.date == target_date)
            .count()
        )
        if count > 0:
            return True
        # Also count as exercise if steps >= 5000 for the day
        step_row = (
            db.query(func.sum(StepEntry.step_count))
            .filter(StepEntry.user_id == user_id, StepEntry.date == target_date)
            .scalar()
        )
        return (step_row or 0) >= 5000
    return False


def _get_active_todos_for_date(db: Session, habit_id: int, user_id: int, target_date: date) -> List[TodoItem]:
    """Get active todo items for a given date, including carried-over items."""
    # Items created on that date (done or not, not archived)
    created_today = (
        db.query(TodoItem)
        .filter(
            TodoItem.habit_id == habit_id,
            TodoItem.user_id == user_id,
            TodoItem.created_date == target_date,
            TodoItem.is_archived == False,
        )
        .all()
    )

    # Undone + unarchived items from previous days (carry-over)
    carried_over_undone = (
        db.query(TodoItem)
        .filter(
            TodoItem.habit_id == habit_id,
            TodoItem.user_id == user_id,
            TodoItem.created_date < target_date,
            TodoItem.is_archived == False,
            TodoItem.is_done == False,
        )
        .all()
    )

    # Items from previous days done ON that date
    carried_over_done_today = (
        db.query(TodoItem)
        .filter(
            TodoItem.habit_id == habit_id,
            TodoItem.user_id == user_id,
            TodoItem.created_date < target_date,
            TodoItem.is_archived == False,
            TodoItem.is_done == True,
            TodoItem.done_date == target_date,
        )
        .all()
    )

    # Merge without duplicates
    seen_ids = set()
    result = []
    for item in created_today + carried_over_undone + carried_over_done_today:
        if item.id not in seen_ids:
            seen_ids.add(item.id)
            result.append(item)
    return result


def _build_todo_summary(db: Session, habit_id: int, user_id: int, target_date: date) -> TodoSummary:
    """Build a TodoSummary for a habit on a given date."""
    items = _get_active_todos_for_date(db, habit_id, user_id, target_date)
    item_responses = []
    done_count = 0
    for item in items:
        is_carried = item.created_date < target_date
        # For the purpose of this date, an item is "done" if:
        # - created today and is_done, or
        # - carried over and done_date == target_date
        is_done_for_date = False
        if item.created_date == target_date:
            is_done_for_date = item.is_done
        else:
            is_done_for_date = item.is_done and item.done_date == target_date

        if is_done_for_date:
            done_count += 1

        item_responses.append(TodoItemResponse(
            id=item.id,
            habit_id=item.habit_id,
            text=item.text,
            is_done=is_done_for_date,
            done_date=item.done_date,
            created_date=item.created_date,
            is_archived=item.is_archived,
            is_carried_over=is_carried,
            created_at=item.created_at,
        ))

    total = len(item_responses)
    return TodoSummary(
        total=total,
        done=done_count,
        pending=total - done_count,
        items=item_responses,
    )


def _is_completed_on_date(db: Session, user_id: int, habit: Habit, target_date: date) -> bool:
    """Check if a habit is completed on a specific date (manual log or auto-completion)."""
    if habit.is_default and _check_auto_completion(db, user_id, habit, target_date):
        return True

    # Todo habits: complete if at least 1 item is done
    if habit.habit_type == "todo":
        summary = _build_todo_summary(db, habit.id, user_id, target_date)
        return summary.done > 0

    # Check manual log
    log = (
        db.query(HabitLog)
        .filter(
            HabitLog.habit_id == habit.id,
            HabitLog.user_id == user_id,
            HabitLog.date == target_date,
        )
        .first()
    )
    return log is not None


@router.get("/", response_model=List[HabitResponse])
def get_habits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_defaults(db, user.id)
    habits = (
        db.query(Habit)
        .filter(Habit.user_id == user.id, Habit.is_active == True)
        .order_by(Habit.is_default.desc(), Habit.created_at.asc())
        .all()
    )
    return [HabitResponse.model_validate(h) for h in habits]


@router.post("/", response_model=HabitResponse)
def create_habit(
    body: HabitCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.frequency not in ("daily", "weekly", "monthly"):
        raise HTTPException(status_code=400, detail="frequency must be daily, weekly, or monthly")
    if body.habit_type not in ("boolean", "descriptive", "todo"):
        raise HTTPException(status_code=400, detail="habit_type must be boolean, descriptive, or todo")
    habit = Habit(
        user_id=user.id,
        name=body.name,
        icon=body.icon,
        color=body.color,
        frequency=body.frequency,
        frequency_target=body.frequency_target,
        habit_type=body.habit_type,
        is_default=False,
        is_active=True,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return HabitResponse.model_validate(habit)


@router.put("/{habit_id}", response_model=HabitResponse)
def update_habit(
    habit_id: int,
    body: HabitUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    updates = body.dict(exclude_unset=True)
    if "frequency" in updates and updates["frequency"] not in ("daily", "weekly", "monthly"):
        raise HTTPException(status_code=400, detail="frequency must be daily, weekly, or monthly")
    if "habit_type" in updates and updates["habit_type"] not in ("boolean", "descriptive", "todo"):
        raise HTTPException(status_code=400, detail="habit_type must be boolean, descriptive, or todo")
    for field, value in updates.items():
        setattr(habit, field, value)

    db.commit()
    db.refresh(habit)
    return HabitResponse.model_validate(habit)


@router.delete("/{habit_id}")
def delete_habit(
    habit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    if habit.is_default:
        # Soft-delete default habits
        habit.is_active = False
        db.commit()
    else:
        db.delete(habit)
        db.commit()
    return {"detail": "Habit deleted"}


@router.post("/{habit_id}/log")
def log_habit(
    habit_id: int,
    log_date: Optional[str] = Query(default=None, alias="date"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    target_date = date.today()
    if log_date:
        try:
            target_date = date.fromisoformat(log_date)
        except ValueError:
            pass

    # Check if already logged
    existing = (
        db.query(HabitLog)
        .filter(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == user.id,
            HabitLog.date == target_date,
        )
        .first()
    )
    if existing:
        return {"detail": "Already logged for this date", "id": existing.id}

    log = HabitLog(habit_id=habit_id, user_id=user.id, date=target_date)
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"detail": "Habit logged", "id": log.id}


@router.post("/{habit_id}/log-descriptive")
async def log_habit_descriptive(
    habit_id: int,
    content: Optional[str] = Form(default=None),
    log_date: Optional[str] = Form(default=None),
    audio: Optional[UploadFile] = File(default=None),
    image: Optional[UploadFile] = File(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    target_date = date.today()
    if log_date:
        try:
            target_date = date.fromisoformat(log_date)
        except ValueError:
            pass
    log_content = content or ""
    log_type = "text"
    image_url = None

    # Handle audio: transcribe via Whisper
    if audio:
        ext = (audio.filename or "audio.m4a").rsplit(".", 1)[-1] if audio.filename else "m4a"
        audio_path = os.path.join(settings.UPLOAD_DIR, f"habit_audio_{uuid.uuid4().hex}.{ext}")
        with open(audio_path, "wb") as f:
            f.write(await audio.read())
        log_content = await transcribe_audio(audio_path)
        log_type = "voice"
        try:
            os.remove(audio_path)
        except OSError:
            pass

    # Handle image: save + describe via GPT-4o Vision
    if image:
        ext = (image.filename or "img.jpg").rsplit(".", 1)[-1] if image.filename else "jpg"
        img_filename = f"habit_{uuid.uuid4().hex}.{ext}"
        img_path = os.path.join(settings.UPLOAD_DIR, img_filename)
        with open(img_path, "wb") as f:
            f.write(await image.read())
        image_url = f"/uploads/{img_filename}"
        if not log_content:
            log_content = await describe_habit_image(img_path, habit.name)
        log_type = "image"

    if not log_content and not image_url:
        log_content = "Completed"
        log_type = "manual"

    log = HabitLog(
        habit_id=habit_id,
        user_id=user.id,
        date=target_date,
        content=log_content,
        image_url=image_url,
        log_type=log_type,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return HabitLogResponse.model_validate(log)


@router.delete("/{habit_id}/log")
def unlog_habit(
    habit_id: int,
    log_date: Optional[str] = Query(default=None, alias="date"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = date.today()
    if log_date:
        try:
            target_date = date.fromisoformat(log_date)
        except ValueError:
            pass

    deleted = (
        db.query(HabitLog)
        .filter(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == user.id,
            HabitLog.date == target_date,
        )
        .delete()
    )
    db.commit()
    return {"detail": "Habit log removed" if deleted else "No log found for this date"}


@router.get("/today", response_model=List[HabitTodayItem])
def get_habits_today(
    target: Optional[str] = Query(default=None, alias="date"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_defaults(db, user.id)
    habits = (
        db.query(Habit)
        .filter(Habit.user_id == user.id, Habit.is_active == True)
        .order_by(Habit.is_default.desc(), Habit.created_at.asc())
        .all()
    )
    today = date.today()
    if target:
        try:
            today = date.fromisoformat(target)
        except ValueError:
            pass
    result = []
    for h in habits:
        completed = _is_completed_on_date(db, user.id, h, today)
        log_entries = (
            db.query(HabitLog)
            .filter(
                HabitLog.habit_id == h.id,
                HabitLog.user_id == user.id,
                HabitLog.date == today,
            )
            .order_by(HabitLog.created_at.asc())
            .all()
        )
        logs_data = [HabitLogResponse.model_validate(e) for e in log_entries]

        todo_summary = None
        if h.habit_type == "todo":
            todo_summary = _build_todo_summary(db, h.id, user.id, today)

        result.append(HabitTodayItem(
            habit=HabitResponse.model_validate(h),
            completed_today=completed,
            logs=logs_data,
            todo_summary=todo_summary,
        ))
    return result


@router.get("/logs", response_model=List[HabitLogDateGroup])
def get_habit_logs(
    date_str: Optional[str] = Query(alias="date", default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return descriptive habit logs grouped by date."""
    _ensure_defaults(db, user.id)

    # Determine date range
    if date_str:
        try:
            single = date.fromisoformat(date_str)
            start_date = single
            end_date = single
        except ValueError:
            start_date = date.today()
            end_date = date.today()
    elif date_from and date_to:
        try:
            start_date = date.fromisoformat(date_from)
            end_date = date.fromisoformat(date_to)
        except ValueError:
            start_date = date.today()
            end_date = date.today()
    else:
        start_date = date.today()
        end_date = date.today()

    # Get all descriptive habits
    descriptive_habits = (
        db.query(Habit)
        .filter(
            Habit.user_id == user.id,
            Habit.is_active == True,
            Habit.habit_type == "descriptive",
        )
        .order_by(Habit.created_at.asc())
        .all()
    )

    if not descriptive_habits:
        return []

    habit_ids = [h.id for h in descriptive_habits]
    habit_map = {h.id: h for h in descriptive_habits}

    # Get all logs in date range
    logs = (
        db.query(HabitLog)
        .filter(
            HabitLog.user_id == user.id,
            HabitLog.habit_id.in_(habit_ids),
            HabitLog.date >= start_date,
            HabitLog.date <= end_date,
        )
        .order_by(HabitLog.date.desc(), HabitLog.created_at.asc())
        .all()
    )

    # Group logs by date
    from collections import defaultdict
    logs_by_date: dict = defaultdict(list)
    for log in logs:
        logs_by_date[log.date].append(log)

    # Build response for each day in range
    result = []
    d = end_date
    while d >= start_date:
        day_logs = logs_by_date.get(d, [])
        logged_habit_ids = set()
        entries = []

        for log in day_logs:
            if log.habit_id in habit_map and log.content:
                habit = habit_map[log.habit_id]
                logged_habit_ids.add(log.habit_id)
                entries.append(HabitLogEntry(
                    habit=HabitResponse.model_validate(habit),
                    log=HabitLogResponse.model_validate(log),
                ))

        unlogged = []
        for h in descriptive_habits:
            if h.id not in logged_habit_ids:
                unlogged.append(HabitResponse.model_validate(h))

        if entries or unlogged:
            result.append(HabitLogDateGroup(
                date=d.isoformat(),
                entries=entries,
                unlogged=unlogged,
            ))

        d -= timedelta(days=1)

    return result


# --- Todo Endpoints ---

@router.get("/{habit_id}/todos", response_model=TodoSummary)
def get_todos(
    habit_id: int,
    target: Optional[str] = Query(default=None, alias="date"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    if habit.habit_type != "todo":
        raise HTTPException(status_code=400, detail="Habit is not a todo type")

    target_date = date.today()
    if target:
        try:
            target_date = date.fromisoformat(target)
        except ValueError:
            pass

    return _build_todo_summary(db, habit.id, user.id, target_date)


@router.post("/{habit_id}/todos", response_model=TodoItemResponse)
def create_todo(
    habit_id: int,
    body: TodoItemCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    if habit.habit_type != "todo":
        raise HTTPException(status_code=400, detail="Habit is not a todo type")

    created_date = date.today()
    if body.created_date:
        try:
            created_date = date.fromisoformat(body.created_date)
        except ValueError:
            pass

    item = TodoItem(
        habit_id=habit_id,
        user_id=user.id,
        text=body.text,
        is_done=False,
        created_date=created_date,
        is_archived=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return TodoItemResponse(
        id=item.id,
        habit_id=item.habit_id,
        text=item.text,
        is_done=item.is_done,
        done_date=item.done_date,
        created_date=item.created_date,
        is_archived=item.is_archived,
        is_carried_over=False,
        created_at=item.created_at,
    )


@router.patch("/{habit_id}/todos/{item_id}", response_model=TodoItemResponse)
def update_todo(
    habit_id: int,
    item_id: int,
    body: TodoItemUpdateRequest,
    target: Optional[str] = Query(default=None, alias="date"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(TodoItem)
        .filter(
            TodoItem.id == item_id,
            TodoItem.habit_id == habit_id,
            TodoItem.user_id == user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Todo item not found")

    target_date = date.today()
    if target:
        try:
            target_date = date.fromisoformat(target)
        except ValueError:
            pass

    if body.text is not None:
        item.text = body.text

    if body.is_done is not None:
        if body.is_done and not item.is_done:
            item.is_done = True
            item.done_date = target_date
        elif not body.is_done and item.is_done:
            item.is_done = False
            item.done_date = None

    db.commit()
    db.refresh(item)

    is_carried = item.created_date < target_date
    return TodoItemResponse(
        id=item.id,
        habit_id=item.habit_id,
        text=item.text,
        is_done=item.is_done,
        done_date=item.done_date,
        created_date=item.created_date,
        is_archived=item.is_archived,
        is_carried_over=is_carried,
        created_at=item.created_at,
    )


@router.patch("/{habit_id}/todos/{item_id}/archive", response_model=TodoItemResponse)
def archive_todo(
    habit_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(TodoItem)
        .filter(
            TodoItem.id == item_id,
            TodoItem.habit_id == habit_id,
            TodoItem.user_id == user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Todo item not found")

    item.is_archived = True
    db.commit()
    db.refresh(item)
    return TodoItemResponse(
        id=item.id,
        habit_id=item.habit_id,
        text=item.text,
        is_done=item.is_done,
        done_date=item.done_date,
        created_date=item.created_date,
        is_archived=item.is_archived,
        is_carried_over=False,
        created_at=item.created_at,
    )


@router.delete("/{habit_id}/todos/{item_id}")
def delete_todo(
    habit_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(TodoItem)
        .filter(
            TodoItem.id == item_id,
            TodoItem.habit_id == habit_id,
            TodoItem.user_id == user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Todo item not found")

    db.delete(item)
    db.commit()
    return {"detail": "Todo item deleted"}


@router.get("/streaks", response_model=List[HabitStreakItem])
def get_habit_streaks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_defaults(db, user.id)
    habits = (
        db.query(Habit)
        .filter(Habit.user_id == user.id, Habit.is_active == True)
        .order_by(Habit.is_default.desc(), Habit.created_at.asc())
        .all()
    )
    today = date.today()
    result = []
    for h in habits:
        current_streak = _compute_habit_streak(db, user.id, h, today)
        longest_streak = _compute_longest_streak(db, user.id, h)
        completed_today = _is_completed_on_date(db, user.id, h, today)
        result.append(HabitStreakItem(
            habit_id=h.id,
            name=h.name,
            icon=h.icon,
            color=h.color,
            current_streak=current_streak,
            longest_streak=longest_streak,
            completed_today=completed_today,
        ))
    return result


def _compute_habit_streak(db: Session, user_id: int, habit: Habit, today: date) -> int:
    """Compute current consecutive streak for a habit."""
    if habit.frequency == "daily":
        streak = 0
        d = today
        while True:
            if _is_completed_on_date(db, user_id, habit, d):
                streak += 1
                d -= timedelta(days=1)
            else:
                break
        return streak
    elif habit.frequency == "weekly":
        streak = 0
        # Walk backward by weeks
        week_start = today - timedelta(days=today.weekday())  # Monday
        while True:
            week_end = week_start + timedelta(days=6)
            completed_count = _count_completions_in_range(db, user_id, habit, week_start, min(week_end, today))
            if completed_count >= habit.frequency_target:
                streak += 1
                week_start -= timedelta(days=7)
            else:
                break
        return streak
    elif habit.frequency == "monthly":
        streak = 0
        month_date = today.replace(day=1)
        while True:
            next_month = (month_date.replace(day=28) + timedelta(days=4)).replace(day=1)
            month_end = next_month - timedelta(days=1)
            completed_count = _count_completions_in_range(db, user_id, habit, month_date, min(month_end, today))
            if completed_count >= habit.frequency_target:
                streak += 1
                month_date = (month_date - timedelta(days=1)).replace(day=1)
            else:
                break
        return streak
    return 0


def _count_completions_in_range(db: Session, user_id: int, habit: Habit, start: date, end: date) -> int:
    """Count days with completions in a date range."""
    count = 0
    d = start
    while d <= end:
        if _is_completed_on_date(db, user_id, habit, d):
            count += 1
        d += timedelta(days=1)
    return count


def _compute_longest_streak(db: Session, user_id: int, habit: Habit) -> int:
    """Compute the longest-ever streak for a habit (daily only, simplified)."""
    if habit.frequency != "daily":
        # For weekly/monthly, just return current streak as longest (simplified)
        return _compute_habit_streak(db, user_id, habit, date.today())

    # Get all logged dates + auto-completion dates for last 365 days
    today = date.today()
    start = today - timedelta(days=365)
    active_dates = set()

    # Manual logs
    logs = (
        db.query(HabitLog.date)
        .filter(
            HabitLog.habit_id == habit.id,
            HabitLog.user_id == user_id,
            HabitLog.date >= start,
        )
        .all()
    )
    for (d,) in logs:
        active_dates.add(d)

    # For default habits, also check auto-completion for each day with data
    if habit.is_default:
        d = start
        while d <= today:
            if d not in active_dates and _check_auto_completion(db, user_id, habit, d):
                active_dates.add(d)
            d += timedelta(days=1)

    if not active_dates:
        return 0

    # Walk through sorted dates and find longest consecutive run
    sorted_dates = sorted(active_dates)
    longest = 1
    current = 1
    for i in range(1, len(sorted_dates)):
        if sorted_dates[i] - sorted_dates[i - 1] == timedelta(days=1):
            current += 1
            longest = max(longest, current)
        else:
            current = 1
    return longest
