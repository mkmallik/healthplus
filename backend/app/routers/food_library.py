import json
from difflib import SequenceMatcher
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Meal, Food, FoodLibrary
from app.schemas import FoodLibraryResponse, FoodResponse, QuickLogRequest
from app.auth import get_current_user, create_log
from app.services.usda_service import search_usda

router = APIRouter()


def _parse_aliases(item: FoodLibrary) -> FoodLibraryResponse:
    aliases = None
    if item.aliases:
        try:
            aliases = json.loads(item.aliases)
        except (json.JSONDecodeError, TypeError):
            pass
    return FoodLibraryResponse(
        id=item.id,
        name=item.name,
        aliases=aliases,
        calories_per_100g=item.calories_per_100g,
        protein_per_100g=item.protein_per_100g,
        carbs_per_100g=item.carbs_per_100g,
        fat_per_100g=item.fat_per_100g,
        fiber_per_100g=item.fiber_per_100g,
        sugar_per_100g=item.sugar_per_100g,
        sodium_per_100g=item.sodium_per_100g,
        category=item.category,
        serving_size_g=item.serving_size_g,
    )


def _fuzzy_score(query: str, target: str) -> float:
    q = query.lower().strip()
    t = target.lower().strip()
    if q in t:
        return 0.9
    return SequenceMatcher(None, q, t).ratio()


@router.get("/search", response_model=List[FoodLibraryResponse])
def search_food_library(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    all_items = db.query(FoodLibrary).all()
    scored = []
    threshold = 0.4
    for item in all_items:
        best = _fuzzy_score(q, item.name)
        if item.aliases:
            try:
                alias_list = json.loads(item.aliases)
                for alias in alias_list:
                    s = _fuzzy_score(q, alias)
                    if s > best:
                        best = s
            except (json.JSONDecodeError, TypeError):
                pass
        if best >= threshold:
            scored.append((best, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [_parse_aliases(item) for _, item in scored[:20]]


@router.get("/categories", response_model=List[str])
def list_categories(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.query(FoodLibrary.category).distinct().order_by(FoodLibrary.category).all()
    return [r[0] for r in rows]


@router.get("", response_model=List[FoodLibraryResponse])
def list_food_library(
    category: Optional[str] = None,
    offset: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(FoodLibrary)
    if category:
        q = q.filter(FoodLibrary.category == category)
    items = q.order_by(FoodLibrary.name).offset(offset).limit(limit).all()
    return [_parse_aliases(item) for item in items]


@router.post("/quick-log", response_model=FoodResponse)
def quick_log(
    body: QuickLogRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    valid_types = ("breakfast", "lunch", "dinner", "snack")
    if body.meal_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"meal_type must be one of {valid_types}")

    lib_item = db.query(FoodLibrary).filter(FoodLibrary.id == body.food_library_id).first()
    if lib_item is None:
        raise HTTPException(status_code=404, detail="Food library item not found")

    ratio = body.portion_grams / 100.0
    calories = lib_item.calories_per_100g * ratio
    protein = lib_item.protein_per_100g * ratio
    carbs = lib_item.carbs_per_100g * ratio
    fat = lib_item.fat_per_100g * ratio
    fiber = lib_item.fiber_per_100g * ratio
    sugar = lib_item.sugar_per_100g * ratio
    sodium = lib_item.sodium_per_100g * ratio

    today = date.today()
    meal = db.query(Meal).filter(
        Meal.user_id == user.id,
        Meal.meal_type == body.meal_type,
        Meal.date == today,
    ).first()

    if meal is None:
        meal = Meal(user_id=user.id, meal_type=body.meal_type, date=today)
        db.add(meal)
        db.flush()

    food = Food(
        meal_id=meal.id,
        description=f"{lib_item.name} ({int(body.portion_grams)}g)",
        calories=round(calories, 1),
        protein=round(protein, 1),
        carbs=round(carbs, 1),
        fat=round(fat, 1),
        fiber=round(fiber, 1),
        sugar=round(sugar, 1),
        sodium=round(sodium, 1),
    )
    db.add(food)
    db.commit()
    db.refresh(food)

    create_log(db, user.id, "quick_log", {
        "food_id": food.id,
        "library_item": lib_item.name,
        "portion_grams": body.portion_grams,
    })

    return FoodResponse(
        id=food.id,
        meal_id=food.meal_id,
        description=food.description,
        image_path=food.image_path,
        calories=food.calories,
        protein=food.protein,
        carbs=food.carbs,
        fat=food.fat,
        fiber=food.fiber,
        sugar=food.sugar,
        sodium=food.sodium,
        analysis=None,
        created_at=food.created_at,
    )


@router.get("/usda-search")
async def usda_search(
    q: str = Query(..., min_length=1),
    user: User = Depends(get_current_user),
):
    """Proxy search to USDA FoodData Central API."""
    results = await search_usda(q, page_size=10)
    return results
