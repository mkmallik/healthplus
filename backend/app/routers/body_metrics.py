import os
import tempfile
import traceback
from datetime import date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, BodyMetric
from app.schemas import BodyMetricResponse, BodyMetricHistory
from app.auth import get_current_user, create_log
from app.services.openai_service import transcribe_audio, analyze_body_metric

router = APIRouter()


@router.post("/log", response_model=List[BodyMetricResponse])
async def log_body_metric(
    description: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    metric_date: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return await _process_body_metric_log(description, audio, metric_date, user, db)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def _process_body_metric_log(text_description, audio, metric_date, user, db):
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

    result = await analyze_body_metric(combined_description)
    metrics = result.get("metrics", [])

    if not metrics:
        raise HTTPException(status_code=400, detail="Could not extract any body metrics from the description")

    target_date = date.today()
    if metric_date:
        try:
            target_date = date.fromisoformat(metric_date)
        except ValueError:
            pass

    responses = []
    for m in metrics:
        metric_type = m.get("metric_type", "weight")
        if metric_type not in ("weight", "waist", "biceps"):
            continue

        # Delete existing entries for same user + date + metric_type (keep only latest)
        db.query(BodyMetric).filter(
            BodyMetric.user_id == user.id,
            BodyMetric.date == target_date,
            BodyMetric.metric_type == metric_type,
        ).delete()
        db.flush()

        entry = BodyMetric(
            user_id=user.id,
            metric_type=metric_type,
            value=float(m.get("value", 0)),
            unit=m.get("unit", "kg" if metric_type == "weight" else "cm"),
            notes=m.get("notes", ""),
            date=target_date,
        )
        db.add(entry)
        db.flush()

        create_log(db, user.id, "body_metric_logged", {
            "body_metric_id": entry.id,
            "metric_type": metric_type,
            "value": entry.value,
            "unit": entry.unit,
        })

        responses.append(BodyMetricResponse(
            id=entry.id,
            metric_type=entry.metric_type,
            value=entry.value,
            unit=entry.unit,
            notes=entry.notes,
            date=entry.date,
            created_at=entry.created_at,
            transcription=transcription or combined_description,
        ))

    db.commit()

    if not responses:
        raise HTTPException(status_code=400, detail="No valid body metrics found in description")

    return responses


@router.get("/", response_model=BodyMetricHistory)
def get_body_metrics(
    type: str = Query(default="weight"),
    days: int = Query(default=30),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if type not in ("weight", "waist", "biceps"):
        raise HTTPException(status_code=400, detail="type must be 'weight', 'waist', or 'biceps'")

    since = date.today() - timedelta(days=days)
    entries = (
        db.query(BodyMetric)
        .filter(
            BodyMetric.user_id == user.id,
            BodyMetric.metric_type == type,
            BodyMetric.date >= since,
        )
        .order_by(BodyMetric.date.desc(), BodyMetric.created_at.desc())
        .all()
    )

    entry_responses = [
        BodyMetricResponse(
            id=e.id,
            metric_type=e.metric_type,
            value=e.value,
            unit=e.unit,
            notes=e.notes,
            date=e.date,
            created_at=e.created_at,
        )
        for e in entries
    ]

    latest_value = entries[0].value if entries else None
    change = None
    if len(entries) >= 2:
        change = round(entries[0].value - entries[1].value, 2)

    return BodyMetricHistory(
        metric_type=type,
        entries=entry_responses,
        latest_value=latest_value,
        change_from_previous=change,
    )


@router.delete("/{metric_id}")
def delete_body_metric(
    metric_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(BodyMetric)
        .filter(BodyMetric.id == metric_id, BodyMetric.user_id == user.id)
        .first()
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Body metric not found")

    db.delete(entry)
    db.commit()
    return {"detail": "Body metric entry deleted"}
