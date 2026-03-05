import json
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Meal
from app.schemas import MealResponse, MealInsightsResponse
from app.auth import get_current_user
from app.routers.food import _food_to_response
from app.services.openai_service import analyze_meal

router = APIRouter()


def _meal_to_response(meal: Meal) -> MealResponse:
    foods = [_food_to_response(f) for f in meal.foods]
    return MealResponse(
        id=meal.id,
        meal_type=meal.meal_type,
        date=meal.date,
        foods=foods,
        total_calories=sum(f.calories for f in foods),
        total_protein=sum(f.protein for f in foods),
        total_carbs=sum(f.carbs for f in foods),
        total_fat=sum(f.fat for f in foods),
    )


@router.get("", response_model=List[MealResponse])
def get_meals(
    date_str: date = Query(alias="date", default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query_date = date_str or date.today()
    meals = (
        db.query(Meal)
        .filter(Meal.user_id == user.id, Meal.date == query_date)
        .order_by(Meal.meal_type)
        .all()
    )
    return [_meal_to_response(m) for m in meals]


@router.get("/{meal_id}", response_model=MealResponse)
def get_meal(
    meal_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.user_id == user.id).first()
    if meal is None:
        raise HTTPException(status_code=404, detail="Meal not found")
    return _meal_to_response(meal)


@router.get("/{meal_id}/insights", response_model=MealInsightsResponse)
async def get_meal_insights(
    meal_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.user_id == user.id).first()
    if meal is None:
        raise HTTPException(status_code=404, detail="Meal not found")

    if not meal.foods:
        raise HTTPException(status_code=400, detail="Meal has no food entries")

    foods_data = []
    food_names = []
    total_cal = total_prot = total_carb = total_fat = 0.0
    total_fiber = total_sugar = total_sodium = 0.0

    for f in meal.foods:
        foods_data.append({
            "description": f.description or "Unknown food",
            "calories": f.calories,
            "protein": f.protein,
            "carbs": f.carbs,
            "fat": f.fat,
            "fiber": f.fiber,
            "sugar": f.sugar,
            "sodium": f.sodium,
        })
        food_names.append(f.description or "Unknown food")
        total_cal += f.calories
        total_prot += f.protein
        total_carb += f.carbs
        total_fat += f.fat
        total_fiber += f.fiber
        total_sugar += f.sugar
        total_sodium += f.sodium

    analysis = await analyze_meal(foods_data)

    return MealInsightsResponse(
        meal_id=meal.id,
        meal_type=meal.meal_type,
        total_calories=round(total_cal, 1),
        total_protein=round(total_prot, 1),
        total_carbs=round(total_carb, 1),
        total_fat=round(total_fat, 1),
        total_fiber=round(total_fiber, 1),
        total_sugar=round(total_sugar, 1),
        total_sodium=round(total_sodium, 1),
        food_count=len(meal.foods),
        food_names=food_names,
        health_score=analysis.get("health_score", 5),
        sugar_spike_risk=analysis.get("sugar_spike_risk", "moderate"),
        blood_sugar_impact=analysis.get("blood_sugar_impact", ""),
        glycemic_index_estimate=analysis.get("glycemic_index_estimate", "medium"),
        satiety_rating=analysis.get("satiety_rating", 5),
        satiety_explanation=analysis.get("satiety_explanation", ""),
        fat_loss_context=analysis.get("fat_loss_context", ""),
        meal_timing_advice=analysis.get("meal_timing_advice", ""),
        macro_balance=analysis.get("macro_balance", ""),
        food_synergies=analysis.get("food_synergies", []),
        recommendations=analysis.get("recommendations", []),
        overall_verdict=analysis.get("overall_verdict", ""),
    )
