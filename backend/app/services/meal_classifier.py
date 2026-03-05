from datetime import datetime
from typing import Optional


def classify_meal(hour: Optional[int] = None) -> str:
    if hour is None:
        hour = datetime.now().hour
    if 6 <= hour <= 10:
        return "breakfast"
    elif 11 <= hour <= 14:
        return "lunch"
    elif 17 <= hour <= 21:
        return "dinner"
    else:
        return "snack"
