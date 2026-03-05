import json
import os
import uuid
import tempfile
import traceback
from datetime import date
from difflib import SequenceMatcher
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Meal, Food, FoodLibrary
from app.schemas import FoodResponse, FoodLogResponse, MultiFoodLogResponse, FoodAnalysis, FoodUpdateRequest
from app.auth import get_current_user, create_log
from app.services.meal_classifier import classify_meal
from app.services.openai_service import (
    transcribe_audio, analyze_food_image, analyze_food_text,
    analyze_food_items_separately, analyze_food_image_separately,
)
from app.services.usda_service import search_usda

router = APIRouter()


@router.post("/log", response_model=MultiFoodLogResponse)
async def log_food(
    image: UploadFile = File(...),
    audio: Optional[UploadFile] = File(None),
    description: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return await _process_food_log(image, audio, description, user, db)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def _process_food_log(image, audio, text_description, user, db):
    # Save image
    ext = image.filename.rsplit(".", 1)[-1] if image.filename and "." in image.filename else "jpg"
    image_filename = f"{uuid.uuid4()}.{ext}"
    image_path = os.path.join(settings.UPLOAD_DIR, image_filename)
    content = await image.read()
    with open(image_path, "wb") as f:
        f.write(content)

    # Build description from text input and/or audio transcription
    description = text_description or ""
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

    # Combine: typed text takes priority, audio supplements
    if description and transcription:
        combined_description = f"{description}. {transcription}"
    else:
        combined_description = description or transcription

    # Analyze food image — get separate items
    items = await analyze_food_image_separately(image_path, combined_description)

    # Classify meal type
    meal_type = classify_meal()

    # Find or create meal for today
    today = date.today()
    meal = db.query(Meal).filter(
        Meal.user_id == user.id,
        Meal.meal_type == meal_type,
        Meal.date == today,
    ).first()

    if meal is None:
        meal = Meal(user_id=user.id, meal_type=meal_type, date=today)
        db.add(meal)
        db.flush()

    # Create one Food entry per item
    food_responses = []
    for item in items:
        nutrition = item["nutrition"]
        analysis = item.get("analysis")
        food = Food(
            meal_id=meal.id,
            description=item["name"],
            image_path=image_filename,
            calories=nutrition["calories"],
            protein=nutrition["protein"],
            carbs=nutrition["carbs"],
            fat=nutrition["fat"],
            fiber=nutrition["fiber"],
            sugar=nutrition["sugar"],
            sodium=nutrition["sodium"],
            analysis=json.dumps(analysis) if analysis else None,
        )
        db.add(food)
        db.flush()

        create_log(db, user.id, "food_added", {
            "food_id": food.id,
            "meal_type": meal_type,
            "calories": nutrition["calories"],
        })
        food_responses.append(_food_to_response(food))

    db.commit()

    return MultiFoodLogResponse(
        foods=food_responses,
        meal_type=meal_type,
        transcription=transcription or description,
    )


def _blend_with_library(db: Session, nutrition: dict, analysis) -> dict:
    """If detected food items match library entries (score > 0.6), blend macros 50/50."""
    if not analysis or not isinstance(analysis, dict):
        return nutrition
    food_items = analysis.get("food_items", [])
    if not food_items:
        return nutrition

    lib_all = db.query(FoodLibrary).all()
    if not lib_all:
        return nutrition

    matched_items = []
    for item_name in food_items:
        best_score = 0.0
        best_lib = None
        for lib in lib_all:
            s = SequenceMatcher(None, item_name.lower(), lib.name.lower()).ratio()
            if item_name.lower() in lib.name.lower() or lib.name.lower() in item_name.lower():
                s = max(s, 0.85)
            if lib.aliases:
                try:
                    for alias in json.loads(lib.aliases):
                        sa = SequenceMatcher(None, item_name.lower(), alias.lower()).ratio()
                        if item_name.lower() in alias.lower() or alias.lower() in item_name.lower():
                            sa = max(sa, 0.85)
                        s = max(s, sa)
                except (json.JSONDecodeError, TypeError):
                    pass
            if s > best_score:
                best_score = s
                best_lib = lib
        if best_score > 0.6 and best_lib is not None:
            matched_items.append(best_lib)

    if not matched_items:
        return nutrition

    # Average all matched library items (per 100g), then blend 50/50 with LLM
    keys = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"]
    lib_totals = {k: 0.0 for k in keys}
    for lib in matched_items:
        lib_totals["calories"] += lib.calories_per_100g
        lib_totals["protein"] += lib.protein_per_100g
        lib_totals["carbs"] += lib.carbs_per_100g
        lib_totals["fat"] += lib.fat_per_100g
        lib_totals["fiber"] += lib.fiber_per_100g
        lib_totals["sugar"] += lib.sugar_per_100g
        lib_totals["sodium"] += lib.sodium_per_100g

    blended = {}
    for k in keys:
        llm_val = float(nutrition.get(k, 0))
        lib_val = lib_totals[k]
        blended[k] = round((llm_val + lib_val) / 2.0, 1)

    return blended


def _food_to_response(food: Food) -> FoodResponse:
    """Convert Food model to FoodResponse, deserializing the analysis JSON."""
    data = {
        "id": food.id,
        "meal_id": food.meal_id,
        "description": food.description,
        "image_path": food.image_path,
        "calories": food.calories,
        "protein": food.protein,
        "carbs": food.carbs,
        "fat": food.fat,
        "fiber": food.fiber,
        "sugar": food.sugar,
        "sodium": food.sodium,
        "created_at": food.created_at,
        "analysis": None,
    }
    if food.analysis:
        try:
            data["analysis"] = json.loads(food.analysis)
        except (json.JSONDecodeError, TypeError):
            pass
    return FoodResponse(**data)


@router.get("/recent")
def get_recent_foods(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deduplicated recently logged foods for current user (last 100, unique by description, up to 20)."""
    recent_foods = (
        db.query(Food)
        .join(Meal)
        .filter(Meal.user_id == user.id)
        .order_by(Food.created_at.desc())
        .limit(100)
        .all()
    )

    seen_descriptions = set()
    unique_foods = []
    for food in recent_foods:
        desc = (food.description or "").strip().lower()
        if desc and desc not in seen_descriptions:
            seen_descriptions.add(desc)
            unique_foods.append(_food_to_response(food))
            if len(unique_foods) >= 20:
                break

    return unique_foods


@router.post("/log-text", response_model=MultiFoodLogResponse)
async def log_food_text(
    description: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    meal_type: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log food via text or voice description (no image required)."""
    try:
        return await _process_text_food_log(description, audio, meal_type, user, db)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def _process_text_food_log(text_description, audio, meal_type_override, user, db):
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

    # Analyze food — get separate items
    items = await analyze_food_items_separately(combined_description)

    # Determine meal type
    if meal_type_override and meal_type_override in ("breakfast", "lunch", "dinner", "snack"):
        meal_type = meal_type_override
    else:
        meal_type = classify_meal()

    today = date.today()
    meal = db.query(Meal).filter(
        Meal.user_id == user.id,
        Meal.meal_type == meal_type,
        Meal.date == today,
    ).first()

    if meal is None:
        meal = Meal(user_id=user.id, meal_type=meal_type, date=today)
        db.add(meal)
        db.flush()

    # Create one Food entry per item
    food_responses = []
    for item in items:
        nutrition = item["nutrition"]
        analysis = item.get("analysis")
        food = Food(
            meal_id=meal.id,
            description=item["name"],
            image_path=None,
            calories=nutrition["calories"],
            protein=nutrition["protein"],
            carbs=nutrition["carbs"],
            fat=nutrition["fat"],
            fiber=nutrition["fiber"],
            sugar=nutrition["sugar"],
            sodium=nutrition["sodium"],
            analysis=json.dumps(analysis) if analysis else None,
        )
        db.add(food)
        db.flush()

        create_log(db, user.id, "food_added_text", {
            "food_id": food.id,
            "meal_type": meal_type,
            "calories": nutrition["calories"],
        })
        food_responses.append(_food_to_response(food))

    db.commit()

    return MultiFoodLogResponse(
        foods=food_responses,
        meal_type=meal_type,
        transcription=transcription or combined_description,
    )


@router.post("/relog", response_model=FoodLogResponse)
def relog_food(
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-log a previously logged food (copy nutrition to today)."""
    food_id = body.get("food_id")
    meal_type = body.get("meal_type", "snack")

    if not food_id:
        raise HTTPException(status_code=400, detail="food_id is required")

    valid_types = ("breakfast", "lunch", "dinner", "snack")
    if meal_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"meal_type must be one of {valid_types}")

    # Find the original food entry
    original = (
        db.query(Food)
        .join(Meal)
        .filter(Food.id == food_id, Meal.user_id == user.id)
        .first()
    )
    if original is None:
        raise HTTPException(status_code=404, detail="Food not found")

    # Find or create meal for today
    today = date.today()
    meal = db.query(Meal).filter(
        Meal.user_id == user.id,
        Meal.meal_type == meal_type,
        Meal.date == today,
    ).first()

    if meal is None:
        meal = Meal(user_id=user.id, meal_type=meal_type, date=today)
        db.add(meal)
        db.flush()

    food = Food(
        meal_id=meal.id,
        description=original.description,
        image_path=original.image_path,
        calories=original.calories,
        protein=original.protein,
        carbs=original.carbs,
        fat=original.fat,
        fiber=original.fiber,
        sugar=original.sugar,
        sodium=original.sodium,
        analysis=original.analysis,
    )
    db.add(food)
    db.commit()
    db.refresh(food)

    create_log(db, user.id, "food_relogged", {
        "food_id": food.id,
        "original_food_id": original.id,
        "meal_type": meal_type,
    })

    food_resp = _food_to_response(food)
    return FoodLogResponse(
        food=food_resp,
        meal_type=meal_type,
        transcription=original.description or "",
    )


async def _blend_with_usda(nutrition: dict, analysis) -> dict:
    """Search USDA for each detected food item, blend 60% USDA / 40% GPT for better accuracy."""
    if not analysis or not isinstance(analysis, dict):
        return nutrition
    food_items = analysis.get("food_items", [])
    if not food_items:
        return nutrition

    # Search USDA for each item
    usda_totals = {
        "calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0,
        "fiber": 0.0, "sugar": 0.0, "sodium": 0.0,
    }
    matched_count = 0

    for item_name in food_items:
        # Strip weight annotations like "(~150g)"
        clean_name = item_name.split("(")[0].strip() if "(" in item_name else item_name
        results = await search_usda(clean_name, page_size=1)
        if results:
            nutrients = results[0]["nutrients_per_100g"]
            for key in usda_totals:
                usda_totals[key] += nutrients.get(key, 0)
            matched_count += 1

    if matched_count == 0:
        return nutrition

    # Blend: 60% USDA per-100g totals weighted by GPT portions, 40% GPT direct
    # Since USDA is per 100g and GPT is already for estimated portions,
    # we use GPT values as the portion-adjusted baseline and just adjust toward USDA ratios
    blended = {}
    for key in nutrition:
        gpt_val = float(nutrition.get(key, 0))
        usda_val = float(usda_totals.get(key, 0))
        if usda_val > 0 and gpt_val > 0:
            blended[key] = round(gpt_val * 0.4 + usda_val * 0.6, 1)
        else:
            blended[key] = round(gpt_val, 1)

    return blended


@router.get("/{food_id}", response_model=FoodResponse)
def get_food(
    food_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food = (
        db.query(Food)
        .join(Meal)
        .filter(Food.id == food_id, Meal.user_id == user.id)
        .first()
    )
    if food is None:
        raise HTTPException(status_code=404, detail="Food not found")
    return _food_to_response(food)


@router.put("/{food_id}", response_model=FoodResponse)
async def update_food(
    food_id: int,
    body: FoodUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food = (
        db.query(Food)
        .join(Meal)
        .filter(Food.id == food_id, Meal.user_id == user.id)
        .first()
    )
    if food is None:
        raise HTTPException(status_code=404, detail="Food not found")

    updates = body.dict(exclude_unset=True)

    # AI recalculation: re-analyze the description and sum nutrition
    if updates.pop("recalculate", None) and updates.get("description"):
        try:
            items = await analyze_food_items_separately(updates["description"])
            totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0, "sugar": 0.0, "sodium": 0.0}
            for item in items:
                n = item["nutrition"]
                for k in totals:
                    totals[k] += float(n.get(k, 0))
            for k in totals:
                totals[k] = round(totals[k], 1)
            updates.update(totals)
            # Use first item's analysis if available
            if items and items[0].get("analysis"):
                updates["analysis"] = json.dumps(items[0]["analysis"])
        except Exception:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="AI recalculation failed")
    else:
        updates.pop("recalculate", None)

    for field, value in updates.items():
        setattr(food, field, value)

    db.commit()
    db.refresh(food)
    return _food_to_response(food)


@router.patch("/{food_id}/move", response_model=FoodResponse)
def move_food(
    food_id: int,
    meal_type: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    valid_types = ("breakfast", "lunch", "dinner", "snack")
    if meal_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"meal_type must be one of {valid_types}")

    food = (
        db.query(Food)
        .join(Meal)
        .filter(Food.id == food_id, Meal.user_id == user.id)
        .first()
    )
    if food is None:
        raise HTTPException(status_code=404, detail="Food not found")

    old_meal = food.meal
    if old_meal.meal_type == meal_type:
        return _food_to_response(food)

    # Find or create target meal for same date
    target_meal = db.query(Meal).filter(
        Meal.user_id == user.id,
        Meal.meal_type == meal_type,
        Meal.date == old_meal.date,
    ).first()

    if target_meal is None:
        target_meal = Meal(user_id=user.id, meal_type=meal_type, date=old_meal.date)
        db.add(target_meal)
        db.flush()

    food.meal_id = target_meal.id
    db.flush()

    # Clean up empty source meal
    remaining = db.query(Food).filter(Food.meal_id == old_meal.id).count()
    if remaining == 0:
        db.delete(old_meal)

    db.commit()
    db.refresh(food)
    return _food_to_response(food)


@router.delete("/{food_id}")
def delete_food(
    food_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    food = (
        db.query(Food)
        .join(Meal)
        .filter(Food.id == food_id, Meal.user_id == user.id)
        .first()
    )
    if food is None:
        raise HTTPException(status_code=404, detail="Food not found")

    # Clean up image file
    if food.image_path:
        image_full_path = os.path.join(settings.UPLOAD_DIR, food.image_path)
        if os.path.exists(image_full_path):
            os.unlink(image_full_path)

    meal = food.meal
    db.delete(food)
    db.flush()

    # Clean up empty meal
    if len(meal.foods) == 0:
        db.delete(meal)

    db.commit()
    return {"detail": "Food entry deleted"}
