"""Seed script to create a default user in the database."""
from app.database import Base, engine, SessionLocal
from app.models import User, Goal
from app.auth import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing = db.query(User).filter(User.username == "demo").first()
    if existing:
        print("Default user 'demo' already exists.")
        db.close()
        return

    user = User(
        username="demo",
        password_hash=hash_password("demo123"),
        name="Demo User",
    )
    db.add(user)
    db.flush()

    goal = Goal(
        user_id=user.id,
        daily_calories=2000,
        daily_protein=50,
        daily_carbs=250,
        daily_fat=65,
        is_active=True,
    )
    db.add(goal)
    db.commit()

    print(f"Created user 'demo' (password: demo123) with id={user.id}")
    print(f"Created default goal with id={goal.id}")
    db.close()


if __name__ == "__main__":
    seed()
