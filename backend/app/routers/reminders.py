import os
import uuid
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Reminder
from app.schemas import ReminderCreateRequest, ReminderResponse
from app.auth import get_current_user
from app.services.openai_service import generate_tts

router = APIRouter()


@router.get("", response_model=List[ReminderResponse])
def get_reminders(
    date_str: Optional[str] = Query(alias="date", default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Reminder).filter(Reminder.user_id == user.id)
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
            query = query.filter(Reminder.reminder_date == target_date)
        except ValueError:
            pass
    reminders = query.order_by(Reminder.reminder_time.asc()).all()
    return [ReminderResponse.model_validate(r) for r in reminders]


@router.post("", response_model=ReminderResponse)
async def create_reminder(
    body: ReminderCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = date.today()
    if body.reminder_date:
        try:
            target_date = date.fromisoformat(body.reminder_date)
        except ValueError:
            pass

    # Generate TTS audio
    audio_filename = f"reminder_{uuid.uuid4().hex}.mp3"
    audio_path = os.path.join(settings.UPLOAD_DIR, audio_filename)
    try:
        await generate_tts(body.text, audio_path)
    except Exception:
        audio_filename = None

    reminder = Reminder(
        user_id=user.id,
        todo_item_id=body.todo_item_id,
        text=body.text,
        reminder_time=body.reminder_time,
        reminder_date=target_date,
        audio_path=audio_filename,
        is_triggered=False,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return ReminderResponse.model_validate(reminder)


@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id, Reminder.user_id == user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Clean up audio file
    if reminder.audio_path:
        path = os.path.join(settings.UPLOAD_DIR, reminder.audio_path)
        if os.path.exists(path):
            os.unlink(path)

    db.delete(reminder)
    db.commit()
    return {"detail": "Reminder deleted"}


@router.patch("/{reminder_id}/trigger")
def trigger_reminder(
    reminder_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id, Reminder.user_id == user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.is_triggered = True
    db.commit()
    return {"detail": "Reminder marked as triggered"}
