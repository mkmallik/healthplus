import os
import uuid
import tempfile
import traceback
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config import settings
from app.database import get_db
from app.models import User, Note
from app.schemas import NoteResponse
from app.auth import get_current_user
from app.services.openai_service import transcribe_audio

router = APIRouter()


def _note_to_response(note: Note) -> NoteResponse:
    return NoteResponse(
        id=note.id,
        title=note.title,
        content=note.content,
        date=note.date,
        audio_path=note.audio_path,
        image_path=note.image_path,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.post("", response_model=NoteResponse)
async def create_note(
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    note_date: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        target_date = date.today()
        if note_date:
            try:
                target_date = date.fromisoformat(note_date)
            except ValueError:
                pass

        combined_content = content or ""
        audio_path = None
        image_path = None

        # Transcribe audio if provided
        if audio is not None:
            audio_ext = audio.filename.rsplit(".", 1)[-1] if audio.filename and "." in audio.filename else "m4a"
            audio_content = await audio.read()
            # Save audio file
            audio_filename = f"note_{uuid.uuid4()}.{audio_ext}"
            audio_full_path = os.path.join(settings.UPLOAD_DIR, audio_filename)
            with open(audio_full_path, "wb") as f:
                f.write(audio_content)
            audio_path = audio_filename

            # Transcribe
            try:
                transcription = await transcribe_audio(audio_full_path)
                if combined_content:
                    combined_content = f"{combined_content}\n\n{transcription}"
                else:
                    combined_content = transcription
            except Exception:
                traceback.print_exc()

        # Save image if provided
        if image is not None:
            img_ext = image.filename.rsplit(".", 1)[-1] if image.filename and "." in image.filename else "jpg"
            img_filename = f"note_{uuid.uuid4()}.{img_ext}"
            img_full_path = os.path.join(settings.UPLOAD_DIR, img_filename)
            img_content = await image.read()
            with open(img_full_path, "wb") as f:
                f.write(img_content)
            image_path = img_filename

        note = Note(
            user_id=user.id,
            title=title or "",
            content=combined_content,
            date=target_date,
            audio_path=audio_path,
            image_path=image_path,
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        return _note_to_response(note)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list)
def get_notes(
    date_str: Optional[str] = Query(alias="date", default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Note).filter(Note.user_id == user.id)

    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
            query = query.filter(Note.date == target_date)
        except ValueError:
            pass
    elif date_from and date_to:
        try:
            from_date = date.fromisoformat(date_from)
            to_date = date.fromisoformat(date_to)
            query = query.filter(Note.date >= from_date, Note.date <= to_date)
        except ValueError:
            pass

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Note.title.ilike(search_pattern),
                Note.content.ilike(search_pattern),
            )
        )

    notes = (
        query
        .order_by(Note.date.desc(), Note.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [_note_to_response(n) for n in notes]


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.user_id == user.id)
        .first()
    )
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return _note_to_response(note)


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.user_id == user.id)
        .first()
    )
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    if "title" in body:
        note.title = body["title"]
    if "content" in body:
        note.content = body["content"]

    db.commit()
    db.refresh(note)
    return _note_to_response(note)


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.user_id == user.id)
        .first()
    )
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    # Clean up files
    if note.audio_path:
        path = os.path.join(settings.UPLOAD_DIR, note.audio_path)
        if os.path.exists(path):
            os.unlink(path)
    if note.image_path:
        path = os.path.join(settings.UPLOAD_DIR, note.image_path)
        if os.path.exists(path):
            os.unlink(path)

    db.delete(note)
    db.commit()
    return {"detail": "Note deleted"}
