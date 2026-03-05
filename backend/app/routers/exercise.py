import json
import os
import tempfile
import traceback
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Exercise
from app.schemas import ExerciseLogResponse, ExerciseSummary
from app.auth import get_current_user, create_log
from app.services.openai_service import transcribe_audio, analyze_exercise

router = APIRouter()


def _exercise_to_response(ex: Exercise, transcription: str = "") -> ExerciseLogResponse:
    muscle_groups = None
    if ex.muscle_groups:
        try:
            muscle_groups = json.loads(ex.muscle_groups)
        except (json.JSONDecodeError, TypeError):
            pass

    analysis = None
    if ex.analysis:
        try:
            analysis = json.loads(ex.analysis)
        except (json.JSONDecodeError, TypeError):
            pass

    summary = None
    if analysis and isinstance(analysis, dict):
        summary = analysis.get("analysis")

    return ExerciseLogResponse(
        id=ex.id,
        exercise_type=ex.exercise_type,
        description=ex.description,
        duration_minutes=ex.duration_minutes,
        calories_burned=ex.calories_burned,
        intensity=ex.intensity,
        muscle_groups=muscle_groups,
        analysis=analysis,
        summary=summary,
        date=ex.date,
        created_at=ex.created_at,
        transcription=transcription,
    )


@router.post("/log", response_model=ExerciseLogResponse)
async def log_exercise(
    description: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    exercise_date: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return await _process_exercise_log(description, audio, exercise_date, user, db)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def _process_exercise_log(text_description, audio, exercise_date, user, db):
    combined_description = text_description or ""
    transcription = ""

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

    if combined_description and transcription:
        combined_description = f"{combined_description}. {transcription}"
    else:
        combined_description = combined_description or transcription

    if not combined_description.strip():
        raise HTTPException(status_code=400, detail="Provide a description or audio recording")

    result = await analyze_exercise(combined_description)

    target_date = date.today()
    if exercise_date:
        try:
            target_date = date.fromisoformat(exercise_date)
        except ValueError:
            pass

    exercise = Exercise(
        user_id=user.id,
        exercise_type=result["exercise_type"],
        description=combined_description,
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
    db.refresh(exercise)

    create_log(db, user.id, "exercise_logged", {
        "exercise_id": exercise.id,
        "exercise_type": result["exercise_type"],
        "calories_burned": result["calories_burned"],
    })

    return _exercise_to_response(exercise, transcription or combined_description)


@router.get("/", response_model=ExerciseSummary)
def get_exercises(
    date_str: Optional[date] = Query(alias="date", default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = date_str or date.today()
    exercises = (
        db.query(Exercise)
        .filter(Exercise.user_id == user.id, Exercise.date == target_date)
        .order_by(Exercise.created_at.desc())
        .all()
    )

    exercise_responses = [_exercise_to_response(ex) for ex in exercises]

    return ExerciseSummary(
        total_exercises=len(exercises),
        total_calories_burned=sum(ex.calories_burned for ex in exercises),
        total_duration_minutes=sum(ex.duration_minutes for ex in exercises),
        exercises=exercise_responses,
    )


@router.get("/recent")
def get_recent_exercises(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recent = (
        db.query(Exercise)
        .filter(Exercise.user_id == user.id)
        .order_by(Exercise.created_at.desc())
        .limit(100)
        .all()
    )

    seen = set()
    unique = []
    for ex in recent:
        key = (ex.exercise_type, (ex.description or "").strip().lower())
        if key not in seen:
            seen.add(key)
            unique.append(_exercise_to_response(ex))
            if len(unique) >= 20:
                break

    return unique


@router.delete("/{exercise_id}")
def delete_exercise(
    exercise_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exercise = (
        db.query(Exercise)
        .filter(Exercise.id == exercise_id, Exercise.user_id == user.id)
        .first()
    )
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")

    db.delete(exercise)
    db.commit()
    return {"detail": "Exercise entry deleted"}
