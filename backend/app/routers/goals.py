from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Goal
from app.schemas import GoalRequest, GoalResponse
from app.auth import get_current_user, create_log

router = APIRouter()


@router.get("", response_model=Optional[GoalResponse])
def get_active_goal(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = (
        db.query(Goal)
        .filter(Goal.user_id == user.id, Goal.is_active == True)
        .first()
    )
    if goal is None:
        return None
    return GoalResponse.model_validate(goal)


@router.post("", response_model=GoalResponse)
def create_or_update_goal(
    request: GoalRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Deactivate any existing active goals
    db.query(Goal).filter(
        Goal.user_id == user.id, Goal.is_active == True
    ).update({"is_active": False, "updated_at": datetime.utcnow()})

    goal = Goal(
        user_id=user.id,
        daily_calories=request.daily_calories,
        daily_protein=request.daily_protein,
        daily_carbs=request.daily_carbs,
        daily_fat=request.daily_fat,
        daily_steps=request.daily_steps,
        target_weight=request.target_weight,
        target_weight_unit=request.target_weight_unit,
        target_waist=request.target_waist,
        target_waist_unit=request.target_waist_unit,
        target_biceps=request.target_biceps,
        target_biceps_unit=request.target_biceps_unit,
        is_active=True,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    create_log(db, user.id, "goal_updated", {
        "goal_id": goal.id,
        "calories": goal.daily_calories,
    })

    return GoalResponse.model_validate(goal)
