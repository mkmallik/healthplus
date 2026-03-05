from typing import List, Optional

import httpx

from app.config import settings

USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"

# Map USDA nutrient names to our field names
NUTRIENT_MAP = {
    "Energy": "calories",
    "Protein": "protein",
    "Carbohydrate, by difference": "carbs",
    "Total lipid (fat)": "fat",
    "Fiber, total dietary": "fiber",
    "Sugars, total including NLEA": "sugar",
    "Sugars, Total": "sugar",
    "Sodium, Na": "sodium",
}


def _extract_nutrients(food_nutrients: list) -> dict:
    """Extract and map nutrients from USDA response to our fields."""
    result = {
        "calories": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0,
        "fiber": 0.0,
        "sugar": 0.0,
        "sodium": 0.0,
    }
    for nutrient in food_nutrients:
        name = nutrient.get("nutrientName", "")
        if not name:
            name = nutrient.get("name", "")
        if name in NUTRIENT_MAP:
            key = NUTRIENT_MAP[name]
            value = nutrient.get("value", 0)
            if value and result[key] == 0:
                result[key] = round(float(value), 1)
    return result


async def search_usda(query: str, page_size: int = 5) -> List[dict]:
    """Search USDA FoodData Central. Returns list of dicts with nutrition per 100g."""
    if not settings.USDA_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{USDA_BASE_URL}/foods/search",
                params={
                    "api_key": settings.USDA_API_KEY,
                    "query": query,
                    "pageSize": page_size,
                    "dataType": "SR Legacy,Foundation",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []

    results = []
    for food in data.get("foods", []):
        nutrients = _extract_nutrients(food.get("foodNutrients", []))
        results.append({
            "fdc_id": food.get("fdcId"),
            "description": food.get("description", ""),
            "brand": food.get("brandName", ""),
            "category": food.get("foodCategory", ""),
            "nutrients_per_100g": nutrients,
        })
    return results


async def get_usda_food(fdc_id: int) -> Optional[dict]:
    """Get detailed nutrition for a specific USDA food by FDC ID."""
    if not settings.USDA_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{USDA_BASE_URL}/food/{fdc_id}",
                params={"api_key": settings.USDA_API_KEY},
            )
            resp.raise_for_status()
            food = resp.json()
    except Exception:
        return None

    nutrients = _extract_nutrients(food.get("foodNutrients", []))
    return {
        "fdc_id": food.get("fdcId"),
        "description": food.get("description", ""),
        "category": food.get("foodCategory", {}).get("description", ""),
        "nutrients_per_100g": nutrients,
    }
