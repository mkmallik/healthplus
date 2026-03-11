import os
import uuid
from datetime import date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Reminder, ReminderTrigger
from app.schemas import ReminderCreateRequest, ReminderResponse, ReminderUpdateRequest
from app.auth import get_current_user
from app.services.openai_service import generate_tts

router = APIRouter()

VALID_RECURRENCES = {"onetime", "daily", "weekly", "biweekly", "monthly"}


def _matches_date(reminder: Reminder, target_date: date) -> bool:
    """Check if a reminder should fire on a given date based on recurrence."""
    r = reminder.recurrence or "onetime"
    start = reminder.reminder_date

    if target_date < start:
        return False

    if r == "onetime":
        return target_date == start
    elif r == "daily":
        return True
    elif r == "weekly":
        return (target_date - start).days % 7 == 0
    elif r == "biweekly":
        return (target_date - start).days % 14 == 0
    elif r == "monthly":
        return target_date.day == start.day
    return False


def _is_triggered_on_date(db: Session, reminder: Reminder, target_date: date) -> bool:
    """Check if a reminder was triggered on a specific date."""
    if reminder.recurrence == "onetime":
        return reminder.is_triggered
    return db.query(ReminderTrigger).filter(
        ReminderTrigger.reminder_id == reminder.id,
        ReminderTrigger.trigger_date == target_date,
    ).first() is not None


def _to_response(db: Session, reminder: Reminder, target_date: Optional[date] = None) -> ReminderResponse:
    td = target_date or date.today()
    return ReminderResponse(
        id=reminder.id,
        text=reminder.text,
        reminder_time=reminder.reminder_time,
        reminder_date=reminder.reminder_date,
        audio_path=reminder.audio_path,
        todo_item_id=reminder.todo_item_id,
        is_triggered=reminder.is_triggered,
        recurrence=reminder.recurrence or "onetime",
        is_active=reminder.is_active if reminder.is_active is not None else True,
        is_triggered_today=_is_triggered_on_date(db, reminder, td),
        created_at=reminder.created_at,
    )


@router.get("", response_model=List[ReminderResponse])
def get_reminders(
    date_str: Optional[str] = Query(alias="date", default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = date.today()
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            pass

    all_reminders = (
        db.query(Reminder)
        .filter(Reminder.user_id == user.id)
        .order_by(Reminder.reminder_time.asc())
        .all()
    )

    result = []
    for r in all_reminders:
        is_active = r.is_active if r.is_active is not None else True
        if not is_active:
            continue
        if _matches_date(r, target_date):
            result.append(_to_response(db, r, target_date))

    return result


@router.post("", response_model=ReminderResponse)
async def create_reminder(
    body: ReminderCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recurrence = body.recurrence if body.recurrence in VALID_RECURRENCES else "onetime"

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
        recurrence=recurrence,
        is_active=True,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return _to_response(db, reminder, target_date)


@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: int,
    body: ReminderUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id, Reminder.user_id == user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    if body.text is not None and body.text != reminder.text:
        reminder.text = body.text
        # Regenerate TTS
        if reminder.audio_path:
            old_path = os.path.join(settings.UPLOAD_DIR, reminder.audio_path)
            if os.path.exists(old_path):
                os.unlink(old_path)
        audio_filename = f"reminder_{uuid.uuid4().hex}.mp3"
        audio_path = os.path.join(settings.UPLOAD_DIR, audio_filename)
        try:
            await generate_tts(body.text, audio_path)
            reminder.audio_path = audio_filename
        except Exception:
            pass

    if body.reminder_time is not None:
        reminder.reminder_time = body.reminder_time
    if body.recurrence is not None and body.recurrence in VALID_RECURRENCES:
        reminder.recurrence = body.recurrence
    if body.is_active is not None:
        reminder.is_active = body.is_active

    db.commit()
    db.refresh(reminder)
    return _to_response(db, reminder)


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
    date_str: Optional[str] = Query(alias="date", default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id, Reminder.user_id == user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    target_date = date.today()
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            pass

    recurrence = reminder.recurrence or "onetime"
    if recurrence == "onetime":
        reminder.is_triggered = True
    else:
        # For recurring reminders, create a trigger record
        existing = db.query(ReminderTrigger).filter(
            ReminderTrigger.reminder_id == reminder_id,
            ReminderTrigger.trigger_date == target_date,
        ).first()
        if not existing:
            trigger = ReminderTrigger(
                reminder_id=reminder_id,
                trigger_date=target_date,
            )
            db.add(trigger)

    db.commit()
    return {"detail": "Reminder marked as triggered"}
