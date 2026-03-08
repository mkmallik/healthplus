import json
import os
import re
import uuid
import tempfile
import traceback
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, StepEntry, Exercise
from app.schemas import StepEntryResponse, StepSummary
from app.auth import get_current_user, create_log
from app.services.openai_service import analyze_watch_image, transcribe_audio

router = APIRouter()


@router.post("/log", response_model=StepEntryResponse)
async def log_steps(
    step_count: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    step_date: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return await _process_step_log(step_count, image, audio, step_date, user, db)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def _process_step_log(step_count, image, audio, step_date, user, db):
    target_date = date.today()
    if step_date:
        try:
            target_date = date.fromisoformat(step_date)
        except ValueError:
            pass

    source = "manual"
    image_filename = None
    final_step_count = step_count

    # Voice: transcribe audio and extract step count number
    if audio is not None and final_step_count is None:
        audio_ext = audio.filename.rsplit(".", 1)[-1] if audio.filename and "." in audio.filename else "m4a"
        audio_content = await audio.read()
        with tempfile.NamedTemporaryFile(suffix=f".{audio_ext}", delete=False) as tmp:
            tmp.write(audio_content)
            audio_tmp_path = tmp.name
        try:
            transcription = await transcribe_audio(audio_tmp_path)
        finally:
            os.unlink(audio_tmp_path)

        # Extract number from transcription (e.g. "8500 steps" or "eight thousand five hundred")
        numbers = re.findall(r'\d[\d,]*', transcription.replace(",", ""))
        if numbers:
            # Pick the largest number (most likely the step count)
            final_step_count = max(int(n) for n in numbers)
            source = "voice"

    if image is not None:
        ext = image.filename.rsplit(".", 1)[-1] if image.filename and "." in image.filename else "jpg"
        image_filename = f"steps_{uuid.uuid4()}.{ext}"
        image_path = os.path.join(settings.UPLOAD_DIR, image_filename)
        content = await image.read()
        with open(image_path, "wb") as f:
            f.write(content)

        result = await analyze_watch_image(image_path)
        extracted_steps = int(result.get("step_count", 0))
        if extracted_steps > 0:
            final_step_count = extracted_steps
            source = "watch_photo"

    if final_step_count is None or final_step_count <= 0:
        raise HTTPException(status_code=400, detail="Provide step_count or a watch photo with visible steps")

    # Replace existing entry for same user + date (only 1 step entry per day)
    existing = (
        db.query(StepEntry)
        .filter(StepEntry.user_id == user.id, StepEntry.date == target_date)
        .first()
    )
    if existing:
        existing.step_count = final_step_count
        existing.source = source
        existing.image_path = image_filename
        existing.created_at = datetime.utcnow()
        db.flush()
        entry = existing
    else:
        entry = StepEntry(
            user_id=user.id,
            step_count=final_step_count,
            source=source,
            image_path=image_filename,
            date=target_date,
        )
        db.add(entry)
        db.flush()

    # Auto-create walking exercise if steps >= 8000
    if final_step_count >= 8000:
        _auto_create_walking_exercise(final_step_count, target_date, user, db)

    db.commit()
    db.refresh(entry)

    create_log(db, user.id, "steps_logged", {
        "step_entry_id": entry.id,
        "step_count": final_step_count,
        "source": source,
    })

    return StepEntryResponse(
        id=entry.id,
        step_count=entry.step_count,
        source=entry.source,
        image_path=entry.image_path,
        date=entry.date,
        created_at=entry.created_at,
    )


@router.get("/", response_model=StepSummary)
def get_steps(
    date_str: Optional[date] = Query(alias="date", default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = date_str or date.today()
    entries = (
        db.query(StepEntry)
        .filter(StepEntry.user_id == user.id, StepEntry.date == target_date)
        .order_by(StepEntry.created_at.desc())
        .all()
    )

    entry_responses = [
        StepEntryResponse(
            id=e.id,
            step_count=e.step_count,
            source=e.source,
            image_path=e.image_path,
            date=e.date,
            created_at=e.created_at,
        )
        for e in entries
    ]

    return StepSummary(
        total_steps=sum(e.step_count for e in entries),
        entries=entry_responses,
    )


def _auto_create_walking_exercise(step_count: int, target_date: date, user: User, db: Session):
    """Create a walking exercise entry when steps >= 8000."""
    existing = db.query(Exercise).filter(
        Exercise.user_id == user.id,
        Exercise.date == target_date,
        Exercise.exercise_type == "walking",
        Exercise.description.like("%auto-logged from steps%"),
    ).first()

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
                "analysis": f"Walking {step_count:,} steps covering approximately {distance_km} km.",
                "recovery_advice": "Stay hydrated and stretch your legs.",
                "health_benefits": ["Improved cardiovascular health", "Better mood", "Weight management"],
            }),
            date=target_date,
        )
        db.add(exercise)
