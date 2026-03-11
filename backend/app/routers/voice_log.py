import json
import os
import re
import uuid
import tempfile
import traceback
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Meal, Food, Exercise, StepEntry, BodyMetric, Habit, HabitLog, TodoItem, Note, Reminder
from app.schemas import VoiceLogResponse
from app.auth import get_current_user, create_log
from app.services.openai_service import (
    transcribe_audio,
    classify_voice_input,
    analyze_food_items_separately,
    analyze_exercise,
    analyze_body_metric,
    refine_transcription,
    generate_tts,
)
from app.services.meal_classifier import classify_meal

router = APIRouter()


@router.post("/process", response_model=VoiceLogResponse)
async def process_voice_log(
    audio: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    log_date: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Universal voice log: transcribe, classify intent, and route to appropriate handler."""
    try:
        transcription = text or ""

        # Transcribe audio if provided
        if audio is not None:
            audio_ext = audio.filename.rsplit(".", 1)[-1] if audio.filename and "." in audio.filename else "m4a"
            audio_content = await audio.read()
            with tempfile.NamedTemporaryFile(suffix=f".{audio_ext}", delete=False) as tmp:
                tmp.write(audio_content)
                audio_tmp_path = tmp.name
            try:
                transcription = await transcribe_audio(audio_tmp_path)
            finally:
                os.unlink(audio_tmp_path)

        if not transcription.strip():
            raise HTTPException(status_code=400, detail="No audio or text provided")

        target_date = date.today()
        if log_date:
            try:
                target_date = date.fromisoformat(log_date)
            except ValueError:
                pass

        # Get user's habits for classification context
        habits = (
            db.query(Habit)
            .filter(Habit.user_id == user.id, Habit.is_active == True, Habit.habit_type == "descriptive")
            .all()
        )
        todo_habits = (
            db.query(Habit)
            .filter(Habit.user_id == user.id, Habit.is_active == True, Habit.habit_type == "todo")
            .all()
        )

        habit_list = [{"id": h.id, "name": h.name} for h in habits]
        todo_list = [{"id": h.id, "name": h.name} for h in todo_habits]

        # Classify the input
        classification = await classify_voice_input(transcription, habit_list, todo_list)
        category = classification["category"]
        content = classification.get("content", transcription)

        # Route to appropriate handler
        if category == "food":
            return await _handle_food(content, target_date, user, db)
        elif category == "exercise":
            return await _handle_exercise(content, target_date, user, db)
        elif category == "steps":
            return await _handle_steps(content, target_date, user, db)
        elif category == "body_metric":
            return await _handle_body_metric(content, target_date, user, db)
        elif category == "habit_log":
            habit_id = classification.get("habit_id")
            habit_name = classification.get("habit_name")
            return await _handle_habit_log(content, habit_id, habit_name, target_date, user, db)
        elif category == "todo":
            todo_habit_id = classification.get("todo_habit_id")
            return await _handle_todo(content, todo_habit_id, target_date, user, db)
        elif category == "reminder":
            reminder_time = classification.get("reminder_time")
            reminder_text = classification.get("reminder_text") or content
            todo_habit_id = classification.get("todo_habit_id")
            recurrence = classification.get("recurrence", "onetime")
            return await _handle_reminder(reminder_text, reminder_time, target_date, todo_habit_id, recurrence, user, db)
        else:
            # Default to note
            return await _handle_note(content, transcription, target_date, user, db)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def _handle_food(content: str, target_date: date, user: User, db: Session) -> VoiceLogResponse:
    """Handle food logging from voice."""
    items = await analyze_food_items_separately(content)
    meal_type = classify_meal()

    # Get or create meal
    meal = db.query(Meal).filter(
        Meal.user_id == user.id, Meal.meal_type == meal_type, Meal.date == target_date
    ).first()
    if not meal:
        meal = Meal(user_id=user.id, meal_type=meal_type, date=target_date)
        db.add(meal)
        db.flush()

    food_names = []
    total_cal = 0
    for item in items:
        food = Food(
            meal_id=meal.id,
            description=item.get("name", content),
            calories=item["nutrition"]["calories"],
            protein=item["nutrition"]["protein"],
            carbs=item["nutrition"]["carbs"],
            fat=item["nutrition"]["fat"],
            fiber=item["nutrition"]["fiber"],
            sugar=item["nutrition"]["sugar"],
            sodium=item["nutrition"]["sodium"],
            analysis=json.dumps(item.get("analysis")) if item.get("analysis") else None,
        )
        db.add(food)
        food_names.append(item.get("name", "Food"))
        total_cal += item["nutrition"]["calories"]

    db.commit()
    return VoiceLogResponse(
        category="food",
        message=f"Logged {', '.join(food_names)} ({int(total_cal)} kcal) as {meal_type}",
        data={"meal_type": meal_type, "food_count": len(items), "total_calories": total_cal},
    )


async def _handle_exercise(content: str, target_date: date, user: User, db: Session) -> VoiceLogResponse:
    """Handle exercise logging from voice."""
    result = await analyze_exercise(content)
    exercise = Exercise(
        user_id=user.id,
        exercise_type=result["exercise_type"],
        description=content,
        duration_minutes=float(result["duration_minutes"]),
        calories_burned=float(result["calories_burned"]),
        intensity=result["intensity"],
        muscle_groups=json.dumps(result.get("muscle_groups", [])),
        analysis=json.dumps({
            "analysis": result.get("analysis", ""),
            "recovery_advice": result.get("recovery_advice", ""),
            "health_benefits": result.get("health_benefits", []),
        }),
        date=target_date,
    )
    db.add(exercise)
    db.commit()
    return VoiceLogResponse(
        category="exercise",
        message=f"Logged {result['exercise_type']} - {int(result['duration_minutes'])} min, {int(result['calories_burned'])} kcal burned",
        data={"exercise_type": result["exercise_type"], "duration": result["duration_minutes"], "calories": result["calories_burned"]},
    )


async def _handle_steps(content: str, target_date: date, user: User, db: Session) -> VoiceLogResponse:
    """Handle step count from voice."""
    numbers = re.findall(r'\d[\d,]*', content.replace(",", ""))
    if not numbers:
        return VoiceLogResponse(category="steps", message="Could not extract step count from your input.", data=None)
    step_count = max(int(n) for n in numbers)

    # Replace existing for same date
    existing = db.query(StepEntry).filter(
        StepEntry.user_id == user.id, StepEntry.date == target_date
    ).first()
    if existing:
        existing.step_count = step_count
        existing.source = "voice"
        existing.created_at = datetime.utcnow()
    else:
        entry = StepEntry(user_id=user.id, step_count=step_count, source="voice", date=target_date)
        db.add(entry)

    # Auto-create walking exercise if steps >= 8000
    if step_count >= 8000:
        _auto_create_walking_exercise(step_count, target_date, user, db)

    db.commit()
    msg = f"Logged {step_count:,} steps"
    if step_count >= 8000:
        msg += " (also logged as walking exercise)"
    return VoiceLogResponse(
        category="steps",
        message=msg,
        data={"step_count": step_count},
    )


def _auto_create_walking_exercise(step_count: int, target_date: date, user: User, db: Session):
    """Create a walking exercise entry when steps >= 8000."""
    # Check if auto-walking exercise already exists for this date
    existing = db.query(Exercise).filter(
        Exercise.user_id == user.id,
        Exercise.date == target_date,
        Exercise.exercise_type == "walking",
        Exercise.description.like("%auto-logged from steps%"),
    ).first()

    # Estimate: ~1300 steps per km, ~15 min per km walking, 0.04 kcal per step
    duration = round(step_count / 1300 * 15)
    calories = round(step_count * 0.04)
    distance_km = round(step_count / 1300, 1)

    if existing:
        existing.duration_minutes = duration
        existing.calories_burned = calories
        existing.description = f"{step_count:,} steps (~{distance_km} km) - auto-logged from steps"
    else:
        exercise = Exercise(
            user_id=user.id,
            exercise_type="walking",
            description=f"{step_count:,} steps (~{distance_km} km) - auto-logged from steps",
            duration_minutes=duration,
            calories_burned=calories,
            intensity="moderate" if step_count < 12000 else "high",
            muscle_groups=json.dumps(["legs", "glutes", "core"]),
            analysis=json.dumps({
                "analysis": f"Walking {step_count:,} steps covering approximately {distance_km} km. Great cardiovascular activity.",
                "recovery_advice": "Stay hydrated and stretch your legs.",
                "health_benefits": ["Improved cardiovascular health", "Better mood", "Weight management", "Stronger legs"],
            }),
            date=target_date,
        )
        db.add(exercise)


async def _handle_body_metric(content: str, target_date: date, user: User, db: Session) -> VoiceLogResponse:
    """Handle body metric logging from voice."""
    result = await analyze_body_metric(content)
    metrics = result.get("metrics", [])
    if not metrics:
        return VoiceLogResponse(category="body_metric", message="Could not extract body metrics.", data=None)

    logged = []
    for m in metrics:
        metric_type = m.get("metric_type", "weight")
        value = float(m.get("value", 0))
        unit = m.get("unit", "kg")

        # Replace existing for same date + type
        existing = db.query(BodyMetric).filter(
            BodyMetric.user_id == user.id,
            BodyMetric.date == target_date,
            BodyMetric.metric_type == metric_type,
        ).all()
        for e in existing:
            db.delete(e)

        entry = BodyMetric(
            user_id=user.id, metric_type=metric_type, value=value, unit=unit,
            notes=m.get("notes", ""), date=target_date,
        )
        db.add(entry)
        logged.append(f"{metric_type}: {value} {unit}")

    db.commit()
    return VoiceLogResponse(
        category="body_metric",
        message=f"Logged {', '.join(logged)}",
        data={"metrics": metrics},
    )


async def _handle_habit_log(content: str, habit_id: Optional[int], habit_name: Optional[str],
                            target_date: date, user: User, db: Session) -> VoiceLogResponse:
    """Handle descriptive habit logging from voice."""
    if not habit_id:
        return VoiceLogResponse(
            category="habit_log",
            message="Could not determine which habit to log. Please specify the habit.",
            data=None,
        )

    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        return VoiceLogResponse(category="habit_log", message="Habit not found.", data=None)

    refined = await refine_transcription(content, context=f"habit log for '{habit.name}'")

    log = HabitLog(
        habit_id=habit_id, user_id=user.id, date=target_date,
        content=refined, log_type="voice",
    )
    db.add(log)
    db.commit()
    return VoiceLogResponse(
        category="habit_log",
        message=f"Logged '{habit.name}': {refined[:80]}{'...' if len(refined) > 80 else ''}",
        data={"habit_id": habit_id, "habit_name": habit.name, "content": refined},
    )


async def _handle_todo(content: str, todo_habit_id: Optional[int],
                       target_date: date, user: User, db: Session) -> VoiceLogResponse:
    """Handle adding a todo item from voice."""
    if not todo_habit_id:
        # Find first active todo habit
        habit = db.query(Habit).filter(
            Habit.user_id == user.id, Habit.is_active == True, Habit.habit_type == "todo"
        ).first()
        if not habit:
            # Auto-create a default "Todo" habit
            habit = Habit(
                user_id=user.id, name="Todo", icon="checkbox",
                color="#00D4AA", frequency="daily", frequency_target=1,
                habit_type="todo", is_default=False, is_active=True,
            )
            db.add(habit)
            db.flush()
        todo_habit_id = habit.id
    else:
        habit = db.query(Habit).filter(Habit.id == todo_habit_id, Habit.user_id == user.id).first()
        if not habit:
            # Fallback to first todo habit
            habit = db.query(Habit).filter(
                Habit.user_id == user.id, Habit.is_active == True, Habit.habit_type == "todo"
            ).first()
            if not habit:
                habit = Habit(
                    user_id=user.id, name="Todo", icon="checkbox",
                    color="#00D4AA", frequency="daily", frequency_target=1,
                    habit_type="todo", is_default=False, is_active=True,
                )
                db.add(habit)
                db.flush()
            todo_habit_id = habit.id

    # Capitalize first letter of content
    clean_content = content.strip()
    if clean_content:
        clean_content = clean_content[0].upper() + clean_content[1:]

    item = TodoItem(
        habit_id=todo_habit_id, user_id=user.id, text=clean_content,
        is_done=False, created_date=target_date, is_archived=False,
    )
    db.add(item)
    db.commit()
    return VoiceLogResponse(
        category="todo",
        message=f"Added to '{habit.name}': {clean_content}",
        data={"todo_habit_id": todo_habit_id, "habit_name": habit.name, "text": clean_content},
    )


async def _handle_reminder(text: str, reminder_time: Optional[str], target_date: date,
                          todo_habit_id: Optional[int], recurrence: str, user: User, db: Session) -> VoiceLogResponse:
    """Handle creating a reminder with TTS audio."""
    if not reminder_time:
        return VoiceLogResponse(category="reminder", message="Could not determine reminder time.", data=None)

    # Generate TTS audio
    audio_filename = f"reminder_{uuid.uuid4().hex}.mp3"
    audio_path = os.path.join(settings.UPLOAD_DIR, audio_filename)
    try:
        await generate_tts(text, audio_path)
    except Exception:
        traceback.print_exc()
        audio_filename = None

    # Also add as todo item if we have a todo habit
    todo_item_id = None
    if todo_habit_id:
        habit = db.query(Habit).filter(Habit.id == todo_habit_id, Habit.user_id == user.id).first()
        if habit:
            todo_item = TodoItem(
                habit_id=todo_habit_id, user_id=user.id,
                text=f"[Reminder {reminder_time}] {text}",
                is_done=False, created_date=target_date, is_archived=False,
            )
            db.add(todo_item)
            db.flush()
            todo_item_id = todo_item.id

    valid_recurrences = {"onetime", "daily", "weekly", "biweekly", "monthly"}
    if recurrence not in valid_recurrences:
        recurrence = "onetime"

    reminder = Reminder(
        user_id=user.id,
        todo_item_id=todo_item_id,
        text=text,
        reminder_time=reminder_time,
        reminder_date=target_date,
        audio_path=audio_filename,
        is_triggered=False,
        recurrence=recurrence,
        is_active=True,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return VoiceLogResponse(
        category="reminder",
        message=f"Reminder set for {reminder_time}: {text}",
        data={
            "reminder_id": reminder.id,
            "reminder_time": reminder_time,
            "text": text,
            "audio_path": f"/uploads/{audio_filename}" if audio_filename else None,
        },
    )


async def _handle_note(content: str, raw_transcription: str, target_date: date,
                       user: User, db: Session) -> VoiceLogResponse:
    """Handle adding a note from voice."""
    refined = await refine_transcription(content, context="personal note")

    # Generate a short title from the content
    title = refined[:50].split(".")[0].strip()
    if len(title) > 40:
        title = title[:40].rsplit(" ", 1)[0] + "..."

    note = Note(
        user_id=user.id,
        title=title,
        content=refined,
        date=target_date,
    )
    db.add(note)
    db.commit()
    return VoiceLogResponse(
        category="note",
        message=f"Note saved: {refined[:80]}{'...' if len(refined) > 80 else ''}",
        data={"note_id": note.id, "title": title, "content": refined},
    )
