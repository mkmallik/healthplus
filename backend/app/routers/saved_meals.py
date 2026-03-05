from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Meal, Food, SavedMeal, SavedMealItem
from app.schemas import (
    SavedMealCreate,
    SavedMealResponse,
    SavedMealItemResponse,
    RelogSavedMealRequest,
    FoodLogResponse,
    FoodResponse,
)
from app.auth import get_current_user, create_log

router = APIRouter()


def _saved_meal_to_response(sm: SavedMeal) -> SavedMealResponse:
    items = [
        SavedMealItemResponse(
            id=item.id,
            description=item.description,
            calories=item.calories,
            protein=item.protein,
            carbs=item.carbs,
            fat=item.fat,
            fiber=item.fiber,
            sugar=item.sugar,
            sodium=item.sodium,
            food_library_id=item.food_library_id,
            portion_grams=item.portion_grams,
        )
        for item in sm.items
    ]
    return SavedMealResponse(
        id=sm.id,
        name=sm.name,
        items=items,
        total_calories=round(sum(i.calories for i in items), 1),
        total_protein=round(sum(i.protein for i in items), 1),
        total_carbs=round(sum(i.carbs for i in items), 1),
        total_fat=round(sum(i.fat for i in items), 1),
        created_at=sm.created_at,
        updated_at=sm.updated_at,
    )


@router.get("", response_model=List[SavedMealResponse])
def list_saved_meals(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meals = (
        db.query(SavedMeal)
        .filter(SavedMeal.user_id == user.id)
        .order_by(SavedMeal.updated_at.desc())
        .all()
    )
    return [_saved_meal_to_response(m) for m in meals]


@router.post("", response_model=SavedMealResponse)
def create_saved_meal(
    body: SavedMealCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not body.items:
        raise HTTPException(status_code=400, detail="At least one item is required")

    sm = SavedMeal(user_id=user.id, name=body.name)
    db.add(sm)
    db.flush()

    for item_data in body.items:
        item = SavedMealItem(
            saved_meal_id=sm.id,
            description=item_data.description,
            calories=item_data.calories,
            protein=item_data.protein,
            carbs=item_data.carbs,
            fat=item_data.fat,
            fiber=item_data.fiber,
            sugar=item_data.sugar,
            sodium=item_data.sodium,
            food_library_id=item_data.food_library_id,
            portion_grams=item_data.portion_grams,
        )
        db.add(item)

    db.commit()
    db.refresh(sm)

    create_log(db, user.id, "saved_meal_created", {"saved_meal_id": sm.id, "name": sm.name})
    return _saved_meal_to_response(sm)


@router.get("/{saved_meal_id}", response_model=SavedMealResponse)
def get_saved_meal(
    saved_meal_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sm = db.query(SavedMeal).filter(
        SavedMeal.id == saved_meal_id,
        SavedMeal.user_id == user.id,
    ).first()
    if sm is None:
        raise HTTPException(status_code=404, detail="Saved meal not found")
    return _saved_meal_to_response(sm)


@router.delete("/{saved_meal_id}")
def delete_saved_meal(
    saved_meal_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sm = db.query(SavedMeal).filter(
        SavedMeal.id == saved_meal_id,
        SavedMeal.user_id == user.id,
    ).first()
    if sm is None:
        raise HTTPException(status_code=404, detail="Saved meal not found")

    db.delete(sm)
    db.commit()
    return {"detail": "Saved meal deleted"}


@router.post("/{saved_meal_id}/relog")
def relog_saved_meal(
    saved_meal_id: int,
    body: RelogSavedMealRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-log all items from a saved meal template to today."""
    valid_types = ("breakfast", "lunch", "dinner", "snack")
    if body.meal_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"meal_type must be one of {valid_types}")

    sm = db.query(SavedMeal).filter(
        SavedMeal.id == saved_meal_id,
        SavedMeal.user_id == user.id,
    ).first()
    if sm is None:
        raise HTTPException(status_code=404, detail="Saved meal not found")

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

    created_foods = []
    for item in sm.items:
        food = Food(
            meal_id=meal.id,
            description=item.description,
            image_path=None,
            calories=item.calories,
            protein=item.protein,
            carbs=item.carbs,
            fat=item.fat,
            fiber=item.fiber,
            sugar=item.sugar,
            sodium=item.sodium,
        )
        db.add(food)
        created_foods.append(food)

    db.commit()

    create_log(db, user.id, "saved_meal_relogged", {
        "saved_meal_id": sm.id,
        "meal_type": body.meal_type,
        "item_count": len(created_foods),
    })

    return {
        "detail": f"Logged {len(created_foods)} items from '{sm.name}'",
        "meal_type": body.meal_type,
        "item_count": len(created_foods),
    }


@router.post("/from-meal/{meal_id}", response_model=SavedMealResponse)
def save_meal_as_template(
    meal_id: int,
    name: str = Query(..., min_length=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save an existing logged meal as a saved meal template."""
    meal = db.query(Meal).filter(
        Meal.id == meal_id,
        Meal.user_id == user.id,
    ).first()
    if meal is None:
        raise HTTPException(status_code=404, detail="Meal not found")

    if not meal.foods:
        raise HTTPException(status_code=400, detail="Meal has no food items")

    sm = SavedMeal(user_id=user.id, name=name)
    db.add(sm)
    db.flush()

    for food in meal.foods:
        item = SavedMealItem(
            saved_meal_id=sm.id,
            description=food.description,
            calories=food.calories,
            protein=food.protein,
            carbs=food.carbs,
            fat=food.fat,
            fiber=food.fiber,
            sugar=food.sugar,
            sodium=food.sodium,
        )
        db.add(item)

    db.commit()
    db.refresh(sm)

    create_log(db, user.id, "saved_meal_from_meal", {
        "saved_meal_id": sm.id,
        "meal_id": meal_id,
        "name": name,
    })
    return _saved_meal_to_response(sm)
