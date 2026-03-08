import base64
import json
import re

from openai import OpenAI

from app.config import settings

_client = None

# Shared calorie reference data for food analysis prompts
_INDIAN_FOOD_REFS = (
    "INDIAN FOOD CALORIE REFERENCES (standard home-cooked portions):\n"
    "Breads: chapati/roti(1, ~35g)=70-80, tandoori roti(1, ~50g)=120, "
    "plain paratha(1, ~60g)=150-180, stuffed paratha/aloo paratha(1, ~80g)=200-250, "
    "methi paratha(1, ~70g)=180, plain naan(1, ~80g)=260, "
    "butter naan(1, ~80g)=260, garlic naan(1, ~90g)=280, "
    "puri(1)=100-120, bhatura(1, ~120g)=300, kulcha(1)=200-250, "
    "roomali roti(1)=90-100, thepla(1, ~50g)=130, makki roti(1)=110-130\n"
    "Rice (1 cup = ~200g cooked): plain rice=200-240, "
    "veg pulao(1 cup, ~200g)=280, jeera rice(1 cup, ~180g)=240, "
    "curd rice(1 cup, ~220g)=260, lemon rice(1 cup, ~200g)=280, "
    "tamarind rice(1 cup, ~200g)=300, khichdi(1 cup, ~220g)=220, "
    "veg biryani(1 cup, ~200g)=290, paneer biryani(1 cup, ~220g)=350, "
    "chicken biryani(1 serving plate, ~300-350g)=400-500, "
    "mutton biryani(1 cup, ~220g)=360\n"
    "Dals & Curries (1 cup = ~200g): dal tadka(1 cup)=220, "
    "dal makhani(1 cup)=300, kadhi(1 cup)=180, "
    "rajma(1 cup)=180, chole/chana masala(1 cup)=180, "
    "veg korma(1 cup)=250, malai kofta(1 cup)=350, "
    "baingan bharta(1 cup, ~180g)=150, bhindi fry(1 cup, ~180g)=220, "
    "cabbage sabzi(1 cup, ~180g)=110, aloo matar(1 cup)=150, "
    "sambar(1 cup)=100, paneer butter masala(1 cup)=300, "
    "palak paneer(1 cup)=250, shahi paneer(1 cup)=320, "
    "chicken curry(1 cup)=220, butter chicken(1 cup)=300, "
    "mutton curry(1 cup)=350, fish curry(1 cup)=200, "
    "prawn curry(1 cup, ~180g)=240, egg curry(2 eggs)=250-300\n"
    "Paneer & Tofu: paneer tikka(6 pcs, ~150g)=300, "
    "paneer bhurji(1 cup, ~180g)=320, tofu stir fry(1 cup, ~180g)=220\n"
    "Non-veg: chicken tandoori(1 leg, ~150g)=220, "
    "chicken tikka(6 pcs, ~150g)=250, chicken keema(1 cup, ~180g)=280, "
    "fish fry(1 pc, ~120g)=220\n"
    "Eggs: omelette(2 eggs, ~120g)=180, egg bhurji(1 cup, ~150g)=200, "
    "boiled eggs(2, ~100g)=140\n"
    "South Indian: plain dosa(1, ~80g)=120-150, "
    "masala dosa(1, ~150g)=250-300, rava dosa(1, ~120g)=220, "
    "1 idli(~40g)=40-50, medu vada(1)=130-150, "
    "uttapam(1)=200-250, appam(1, ~80g)=120, "
    "pesarattu(1)=150-180, pongal(1 cup, ~200g)=250, "
    "coconut chutney(2 tbsp)=30-40\n"
    "Breakfast: sabudana khichdi(1 cup, ~200g)=300, "
    "besan chilla(2 pcs, ~150g)=250, "
    "plate poha(~200g)=250-300, plate upma(~200g)=200-250\n"
    "Street food: pav bhaji(1 plate, ~350g)=400, "
    "vada pav(1, ~150g)=300, samosa(1, ~80-100g)=250-300, "
    "kachori(1)=200-250, pakora/bhaji(1 pc)=40-60, "
    "pani puri(6 pcs, ~150g)=180, dahi puri(6 pcs, ~200g)=300, "
    "bhel puri(1 plate, ~150g)=220, sev puri(6 pcs, ~180g)=320, "
    "aloo tikki(2 pcs, ~150g)=300, bread pakora(1, ~150g)=300, "
    "mirchi bhaji(1, ~100g)=180, dhokla(2 pcs)=120-150\n"
    "Sweets: gulab jamun(1, ~50g)=150-180, rasgulla(1)=120-150, "
    "barfi/burfi(1 pc, ~40g)=170, peda(1, ~35g)=150, "
    "ladoo(1)=150-200, jalebi(2 pcs, ~60g)=250, "
    "rasmalai(1 pc, ~80g)=200, kulfi(1 stick, ~90g)=180, "
    "kheer/payasam(1 cup)=200-250, halwa(1 cup)=250-350, "
    "gajar halwa(1 cup)=250-300, falooda(1 glass, ~300g)=350\n"
    "Beverages: chai/milk tea(1 cup, ~150ml)=50-60, masala chai(1 cup, ~150ml)=50-60, "
    "black tea(1 cup)=5, filter coffee(1 cup, ~150ml)=90, "
    "black coffee=5, sweet lassi(1 glass, ~250ml)=220, "
    "salted lassi(1 glass, ~250ml)=150, "
    "mango lassi(1 glass, ~300ml)=300, "
    "chaas/buttermilk(1 glass)=40-60, "
    "coconut water(1 glass, ~250ml)=45, "
    "sugarcane juice(1 glass, ~250ml)=180, "
    "fresh lime soda sweet(1 glass)=120, "
    "nimbu pani(sugar)=40-60\n"
    "Accompaniments: raita(1 katori)=50-70, pickle(1 tbsp)=15-30, "
    "roasted papad(1)=40-50, fried papad(1)=80-100, "
    "curd/dahi(1 cup, ~200g)=60-80, ghee(1 tsp)=45, ghee(1 tbsp)=120\n"
    "Dry snacks: roasted peanuts(1 handful, ~30g)=170, "
    "roasted chana(1 handful, ~30g)=120, murukku(1 pc, ~25g)=130\n"
    "Biscuits: monaco biscuit(1 pc, ~3g)=16, monaco biscuit(per 100g)=530, "
    "parle-g(1 biscuit, ~5g)=25, marie gold(1, ~6g)=27, "
    "good day(1, ~6g)=30, oreo(1)=53, hide&seek(1, ~6g)=30"
)

_COMMON_FOOD_REFS = (
    "COMMON REFERENCES:\n"
    "Eggs: 1 large egg=72, 2 boiled eggs(~100g)=140, "
    "2 egg omelette(~120g)=180, egg bhurji(1 cup)=200\n"
    "Other: 1 slice toast/bread(~30g)=75, 1 pat butter(~5g)=36, "
    "1 banana=105, 1 chicken breast(~150g)=230-250, "
    "1 apple=95, 1 glass whole milk(250ml)=150, 1 tbsp oil=120, "
    "ice cream vanilla(1 scoop, ~70g)=140, maggi noodles(1 pack)=300-350\n\n"
    "CRITICAL RULE — NO DOUBLE-COUNTING: When the user lists ingredients "
    "separately (e.g. 'eggs + butter + toast'), count each at BASE value "
    "and sum. Do NOT add hidden cooking fat/oil to an item if the user "
    "already listed butter/oil/ghee as a separate ingredient. "
    "Example: '2 scrambled eggs + toast + butter' = 150 + 75 + 36 = ~261 kcal."
)


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def transcribe_audio(audio_path: str) -> str:
    client = _get_client()
    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )
    return transcript.text


async def refine_transcription(raw_text: str, context: str = "journal entry") -> str:
    """Refine raw voice transcription into clean, well-written text."""
    client = _get_client()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a writing assistant. The user has dictated a "
                    f"{context} via voice. Clean up the raw transcription into "
                    "well-written, natural prose. Fix grammar, punctuation, and "
                    "sentence structure. Preserve the original meaning and all "
                    "details exactly — do not add or remove information. Keep "
                    "the same tone and person (first person if they used it). "
                    "Return ONLY the refined text, nothing else."
                ),
            },
            {"role": "user", "content": raw_text},
        ],
        temperature=0.3,
        max_tokens=1000,
    )
    refined = response.choices[0].message.content
    return refined.strip() if refined else raw_text


def _extract_json(text: str) -> dict:
    """Extract JSON object from text, handling nested braces and markdown code blocks."""
    # Strip markdown code fences
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)

    # Find outermost JSON object by counting braces
    start = text.find("{")
    if start == -1:
        return {}
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i + 1])
                except json.JSONDecodeError:
                    return {}
    return {}


async def analyze_food_image(image_path: str, description: str) -> dict:
    client = _get_client()

    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    ext = image_path.rsplit(".", 1)[-1].lower()
    mime_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp", "gif": "gif"}
    mime_type = f"image/{mime_map.get(ext, 'jpeg')}"

    desc_line = f"The user describes it as: '{description}'. " if description else ""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a professional dietitian and food portion estimator specializing in Indian and global cuisines. "
                    "When analyzing food images, estimate the ACTUAL visible portion size using these cues:\n"
                    "- Standard dinner plate is ~25cm (10 inches), Indian thali plate ~30cm\n"
                    "- 1 katori (small bowl) = ~150ml, standard glass = ~250ml\n"
                    "- A fist-sized portion is ~150g for dense food, ~100g for light food\n"
                    "Use USDA/IFCT standard reference values for nutrient density per gram, "
                    "then multiply by your estimated portion weight. "
                    "Always provide estimated_weight_grams per detected item.\n"
                    "IMPORTANT: Estimate calories PER ITEM first, then sum.\n\n"
                    f"{_INDIAN_FOOD_REFS}\n\n"
                    f"{_COMMON_FOOD_REFS}\n\n"
                    "Do NOT overestimate. Aim for accuracy over caution. "
                    "Round calories to nearest 5 kcal."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"Analyze this food image. {desc_line}"
                            "Return ONLY a JSON object with exactly these two top-level keys:\n\n"
                            "1. \"nutrition\": an object with keys: calories (kcal), protein (g), "
                            "carbs (g), fat (g), fiber (g), sugar (g), sodium (mg). "
                            "If multiple items, sum totals. Base estimates on ACTUAL portion size visible.\n\n"
                            "2. \"analysis\": an object with keys:\n"
                            "   - \"food_items\": list of strings naming each detected food item "
                            "with estimated weight, e.g. \"Grilled chicken breast (~150g)\"\n"
                            "   - \"estimated_weight_grams\": total estimated weight in grams\n"
                            "   - \"health_score\": integer 1-10 (10 = very healthy)\n"
                            "   - \"sugar_spike_risk\": one of \"low\", \"moderate\", \"high\"\n"
                            "   - \"healthy_items\": list of {\"item\": string, \"reason\": string}\n"
                            "   - \"unhealthy_items\": list of {\"item\": string, \"reason\": string}\n"
                            "   - \"recommendations\": list of short actionable recommendation strings\n"
                            "   - \"blood_sugar_impact\": 1-2 sentence explanation of how this meal affects blood sugar\n"
                            "   - \"glycemic_index_estimate\": one of \"low\", \"medium\", \"high\"\n"
                            "   - \"satiety_rating\": integer 1-10 (10 = very filling)\n"
                            "   - \"satiety_explanation\": 1-2 sentence explanation of satiety rating\n"
                            "   - \"fat_loss_context\": 1-2 sentence tip on how this meal fits a fat loss diet\n"
                            "   - \"meal_timing_advice\": 1-2 sentence advice on best time of day to eat this\n\n"
                            "Return ONLY the JSON object, no other text."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}",
                        },
                    },
                ],
            }
        ],
        max_tokens=2000,
    )

    content = response.choices[0].message.content.strip()
    parsed = _extract_json(content)

    # Extract nutrition
    nutrition_raw = parsed.get("nutrition", parsed)
    nutrition_keys = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"]
    nutrition = {k: float(nutrition_raw.get(k, 0)) for k in nutrition_keys}

    # Extract analysis
    analysis = parsed.get("analysis", None)
    if analysis and isinstance(analysis, dict):
        # Ensure expected keys with defaults
        analysis.setdefault("food_items", [])
        analysis.setdefault("health_score", 5)
        analysis.setdefault("sugar_spike_risk", "moderate")
        analysis.setdefault("healthy_items", [])
        analysis.setdefault("unhealthy_items", [])
        analysis.setdefault("recommendations", [])
        analysis.setdefault("blood_sugar_impact", "")
        analysis.setdefault("glycemic_index_estimate", "medium")
        analysis.setdefault("satiety_rating", 5)
        analysis.setdefault("satiety_explanation", "")
        analysis.setdefault("fat_loss_context", "")
        analysis.setdefault("meal_timing_advice", "")

    return {"nutrition": nutrition, "analysis": analysis}


async def analyze_food_text(description: str) -> dict:
    """Analyze food from text description only (no image). Returns same shape as analyze_food_image."""
    client = _get_client()

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a professional dietitian specializing in Indian and global cuisines. "
                    "When analyzing food descriptions, use USDA/IFCT standard reference portions "
                    "unless the user specifies a portion size. 1 katori = ~150ml small bowl.\n"
                    "IMPORTANT: Estimate calories PER ITEM first, then sum.\n\n"
                    f"{_INDIAN_FOOD_REFS}\n\n"
                    f"{_COMMON_FOOD_REFS}\n\n"
                    "Do NOT overestimate. Aim for accuracy over caution. "
                    "Round calories to nearest 5 kcal."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Analyze this food description: \"{description}\"\n\n"
                    "Return ONLY a JSON object with exactly these two top-level keys:\n\n"
                    "1. \"nutrition\": an object with keys: calories (kcal), protein (g), "
                    "carbs (g), fat (g), fiber (g), sugar (g), sodium (mg). "
                    "If multiple items, sum totals.\n\n"
                    "2. \"analysis\": an object with keys:\n"
                    "   - \"food_items\": list of strings naming each detected food item "
                    "with estimated weight, e.g. \"Banana, medium (~118g)\"\n"
                    "   - \"estimated_weight_grams\": total estimated weight in grams\n"
                    "   - \"health_score\": integer 1-10 (10 = very healthy)\n"
                    "   - \"sugar_spike_risk\": one of \"low\", \"moderate\", \"high\"\n"
                    "   - \"healthy_items\": list of {\"item\": string, \"reason\": string}\n"
                    "   - \"unhealthy_items\": list of {\"item\": string, \"reason\": string}\n"
                    "   - \"recommendations\": list of short actionable recommendation strings\n"
                    "   - \"blood_sugar_impact\": 1-2 sentence explanation of how this meal affects blood sugar\n"
                    "   - \"glycemic_index_estimate\": one of \"low\", \"medium\", \"high\"\n"
                    "   - \"satiety_rating\": integer 1-10 (10 = very filling)\n"
                    "   - \"satiety_explanation\": 1-2 sentence explanation of satiety rating\n"
                    "   - \"fat_loss_context\": 1-2 sentence tip on how this meal fits a fat loss diet\n"
                    "   - \"meal_timing_advice\": 1-2 sentence advice on best time of day to eat this\n\n"
                    "Return ONLY the JSON object, no other text."
                ),
            },
        ],
        max_tokens=2000,
    )

    content = response.choices[0].message.content.strip()
    parsed = _extract_json(content)

    nutrition_raw = parsed.get("nutrition", parsed)
    nutrition_keys = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"]
    nutrition = {k: float(nutrition_raw.get(k, 0)) for k in nutrition_keys}

    analysis = parsed.get("analysis", None)
    if analysis and isinstance(analysis, dict):
        analysis.setdefault("food_items", [])
        analysis.setdefault("estimated_weight_grams", 0)
        analysis.setdefault("health_score", 5)
        analysis.setdefault("sugar_spike_risk", "moderate")
        analysis.setdefault("healthy_items", [])
        analysis.setdefault("unhealthy_items", [])
        analysis.setdefault("recommendations", [])
        analysis.setdefault("blood_sugar_impact", "")
        analysis.setdefault("glycemic_index_estimate", "medium")
        analysis.setdefault("satiety_rating", 5)
        analysis.setdefault("satiety_explanation", "")
        analysis.setdefault("fat_loss_context", "")
        analysis.setdefault("meal_timing_advice", "")

    return {"nutrition": nutrition, "analysis": analysis}


def _extract_json_array(text: str) -> list:
    """Extract JSON array from text, handling markdown code blocks."""
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)

    start = text.find("[")
    if start == -1:
        # Fallback: try to parse as object with "items" key
        obj = _extract_json(text)
        if "items" in obj and isinstance(obj["items"], list):
            return obj["items"]
        return []
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i + 1])
                except json.JSONDecodeError:
                    return []
    return []


async def analyze_food_items_separately(description: str) -> list:
    """Analyze food description and return per-item nutrition as a list of dicts."""
    client = _get_client()

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a professional dietitian specializing in Indian and global cuisines. "
                    "When analyzing food descriptions, use USDA/IFCT standard reference portions "
                    "unless the user specifies a portion size. 1 katori = ~150ml small bowl.\n"
                    "IMPORTANT: Return EACH food item SEPARATELY with its own nutrition.\n\n"
                    f"{_INDIAN_FOOD_REFS}\n\n"
                    f"{_COMMON_FOOD_REFS}\n\n"
                    "Do NOT overestimate. Aim for accuracy over caution. "
                    "Round calories to nearest 5 kcal."
                ),
            },
            {
                "role": "user",
                "content": (
                    f'Analyze this food description: "{description}"\n\n'
                    "Split into INDIVIDUAL food items and return a JSON ARRAY. "
                    "Each element must be an object with:\n"
                    '- "name": string (the food item name with portion, e.g. "2 Rotis (~70g)")\n'
                    '- "nutrition": object with keys: calories (kcal), protein (g), carbs (g), fat (g), fiber (g), sugar (g), sodium (mg)\n'
                    '- "analysis": object with keys:\n'
                    '    - "food_items": list containing just this item name with weight\n'
                    '    - "health_score": integer 1-10\n'
                    '    - "sugar_spike_risk": one of "low", "moderate", "high"\n'
                    '    - "healthy_items": list of {"item": string, "reason": string}\n'
                    '    - "unhealthy_items": list of {"item": string, "reason": string}\n'
                    '    - "recommendations": list of short recommendation strings\n'
                    '    - "blood_sugar_impact": 1 sentence\n'
                    '    - "glycemic_index_estimate": one of "low", "medium", "high"\n'
                    '    - "satiety_rating": integer 1-10\n'
                    '    - "satiety_explanation": 1 sentence\n'
                    '    - "fat_loss_context": 1 sentence\n'
                    '    - "meal_timing_advice": 1 sentence\n\n'
                    "IMPORTANT: If the description mentions multiple items (e.g. '2 rotis, dal, salad'), "
                    "return one object per item. If only one item, return an array with one object.\n\n"
                    "Return ONLY the JSON array, no other text."
                ),
            },
        ],
        max_tokens=3000,
    )

    content = response.choices[0].message.content.strip()
    items = _extract_json_array(content)

    # Normalize each item
    result = []
    for item in items:
        if not isinstance(item, dict):
            continue
        name = item.get("name", "Unknown food")
        nutrition_raw = item.get("nutrition", {})
        nutrition_keys = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"]
        nutrition = {k: float(nutrition_raw.get(k, 0)) for k in nutrition_keys}

        analysis = item.get("analysis", None)
        if analysis and isinstance(analysis, dict):
            analysis.setdefault("food_items", [name])
            analysis.setdefault("health_score", 5)
            analysis.setdefault("sugar_spike_risk", "moderate")
            analysis.setdefault("healthy_items", [])
            analysis.setdefault("unhealthy_items", [])
            analysis.setdefault("recommendations", [])
            analysis.setdefault("blood_sugar_impact", "")
            analysis.setdefault("glycemic_index_estimate", "medium")
            analysis.setdefault("satiety_rating", 5)
            analysis.setdefault("satiety_explanation", "")
            analysis.setdefault("fat_loss_context", "")
            analysis.setdefault("meal_timing_advice", "")

        result.append({"name": name, "nutrition": nutrition, "analysis": analysis})

    if not result:
        # Fallback: call single-item analysis
        single = await analyze_food_text(description)
        fallback_name = description[:80] if description else "Food"
        result.append({
            "name": fallback_name,
            "nutrition": single["nutrition"],
            "analysis": single.get("analysis"),
        })

    return result


async def analyze_food_image_separately(image_path: str, description: str) -> list:
    """Analyze food image and return per-item nutrition as a list of dicts."""
    client = _get_client()

    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    ext = image_path.rsplit(".", 1)[-1].lower()
    mime_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp", "gif": "gif"}
    mime_type = f"image/{mime_map.get(ext, 'jpeg')}"

    desc_line = f"The user describes it as: '{description}'. " if description else ""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a professional dietitian and food portion estimator specializing in Indian and global cuisines. "
                    "When analyzing food images, estimate the ACTUAL visible portion size.\n"
                    "- Standard dinner plate is ~25cm (10 inches), Indian thali plate ~30cm\n"
                    "- 1 katori (small bowl) = ~150ml, standard glass = ~250ml\n"
                    "IMPORTANT: Return EACH food item SEPARATELY with its own nutrition.\n\n"
                    f"{_INDIAN_FOOD_REFS}\n\n"
                    f"{_COMMON_FOOD_REFS}\n\n"
                    "Do NOT overestimate. Round calories to nearest 5 kcal."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"Analyze this food image. {desc_line}"
                            "Split into INDIVIDUAL food items and return a JSON ARRAY. "
                            "Each element must be an object with:\n"
                            '"name": string, "nutrition": {calories, protein, carbs, fat, fiber, sugar, sodium}, '
                            '"analysis": {food_items, health_score, sugar_spike_risk, healthy_items, unhealthy_items, '
                            "recommendations, blood_sugar_impact, glycemic_index_estimate, satiety_rating, "
                            "satiety_explanation, fat_loss_context, meal_timing_advice}\n\n"
                            "Return ONLY the JSON array, no other text."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}",
                        },
                    },
                ],
            }
        ],
        max_tokens=3000,
    )

    content = response.choices[0].message.content.strip()
    items = _extract_json_array(content)

    result = []
    for item in items:
        if not isinstance(item, dict):
            continue
        name = item.get("name", "Unknown food")
        nutrition_raw = item.get("nutrition", {})
        nutrition_keys = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"]
        nutrition = {k: float(nutrition_raw.get(k, 0)) for k in nutrition_keys}

        analysis = item.get("analysis", None)
        if analysis and isinstance(analysis, dict):
            analysis.setdefault("food_items", [name])
            analysis.setdefault("health_score", 5)
            analysis.setdefault("sugar_spike_risk", "moderate")
            analysis.setdefault("healthy_items", [])
            analysis.setdefault("unhealthy_items", [])
            analysis.setdefault("recommendations", [])
            analysis.setdefault("blood_sugar_impact", "")
            analysis.setdefault("glycemic_index_estimate", "medium")
            analysis.setdefault("satiety_rating", 5)
            analysis.setdefault("satiety_explanation", "")
            analysis.setdefault("fat_loss_context", "")
            analysis.setdefault("meal_timing_advice", "")

        result.append({"name": name, "nutrition": nutrition, "analysis": analysis})

    if not result:
        # Fallback to single-item analysis
        single = await analyze_food_image(image_path, description)
        fallback_name = description[:80] if description else "Food from image"
        result.append({
            "name": fallback_name,
            "nutrition": single["nutrition"],
            "analysis": single.get("analysis"),
        })

    return result


async def analyze_meal(foods: list) -> dict:
    """Generate holistic meal-level analysis from a list of food items."""
    client = _get_client()

    food_summary = "\n".join(
        f"- {f['description']} ({f['calories']} kcal, P:{f['protein']}g, C:{f['carbs']}g, F:{f['fat']}g, "
        f"Fiber:{f['fiber']}g, Sugar:{f['sugar']}g, Sodium:{f['sodium']}mg)"
        for f in foods
    )
    total_cal = sum(f["calories"] for f in foods)
    total_protein = sum(f["protein"] for f in foods)
    total_carbs = sum(f["carbs"] for f in foods)
    total_fat = sum(f["fat"] for f in foods)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": (
                    f"Analyze this COMPLETE MEAL as a whole (not individual items).\n\n"
                    f"Foods in this meal:\n{food_summary}\n\n"
                    f"Meal totals: {total_cal:.0f} kcal, {total_protein:.0f}g protein, "
                    f"{total_carbs:.0f}g carbs, {total_fat:.0f}g fat\n\n"
                    "Return ONLY a JSON object with these keys:\n"
                    "- \"health_score\": integer 1-10 for the OVERALL meal (10 = very healthy)\n"
                    "- \"sugar_spike_risk\": one of \"low\", \"moderate\", \"high\" for the combined meal\n"
                    "- \"blood_sugar_impact\": 2-3 sentence explanation of how this entire meal affects blood sugar levels together\n"
                    "- \"glycemic_index_estimate\": one of \"low\", \"medium\", \"high\" for the overall meal\n"
                    "- \"satiety_rating\": integer 1-10 for how filling this complete meal is (10 = very filling)\n"
                    "- \"satiety_explanation\": 2-3 sentence explanation of satiety considering all items together\n"
                    "- \"fat_loss_context\": 2-3 sentence analysis of how this meal fits a fat loss diet\n"
                    "- \"meal_timing_advice\": 2-3 sentence advice on best time to eat this meal\n"
                    "- \"macro_balance\": 1-2 sentence verdict on the protein/carb/fat ratio\n"
                    "- \"food_synergies\": list of strings describing positive or negative interactions between the food items\n"
                    "- \"recommendations\": list of 3-5 actionable suggestions to improve this meal\n"
                    "- \"overall_verdict\": 2-3 sentence summary verdict of the entire meal\n\n"
                    "Return ONLY the JSON object, no other text."
                ),
            }
        ],
        max_tokens=1500,
    )

    content = response.choices[0].message.content.strip()
    result = _extract_json(content)

    result.setdefault("health_score", 5)
    result.setdefault("sugar_spike_risk", "moderate")
    result.setdefault("blood_sugar_impact", "")
    result.setdefault("glycemic_index_estimate", "medium")
    result.setdefault("satiety_rating", 5)
    result.setdefault("satiety_explanation", "")
    result.setdefault("fat_loss_context", "")
    result.setdefault("meal_timing_advice", "")
    result.setdefault("macro_balance", "")
    result.setdefault("food_synergies", [])
    result.setdefault("recommendations", [])
    result.setdefault("overall_verdict", "")

    return result


async def analyze_exercise(description: str) -> dict:
    """Analyze exercise description using MET-based calorie estimation."""
    client = _get_client()

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a certified fitness trainer and exercise physiologist. "
                    "Analyze exercise descriptions and estimate calories burned using MET values.\n\n"
                    "Reference MET values:\n"
                    "- Walking (3.5 mph): 3.5 MET\n"
                    "- Brisk walking (4.0 mph): 4.3 MET\n"
                    "- Running (6 mph): 9.8 MET\n"
                    "- Running (8 mph): 13.5 MET\n"
                    "- Badminton (doubles): 5.0 MET\n"
                    "- Badminton (singles, competitive): 7.0 MET\n"
                    "- Weight training (general): 3.5 MET\n"
                    "- Weight training (vigorous): 6.0 MET\n"
                    "- Cycling (moderate): 6.8 MET\n"
                    "- Swimming (moderate): 5.8 MET\n"
                    "- Yoga: 2.5 MET\n\n"
                    "Formula: Calories = MET x weight_kg x duration_hours\n"
                    "Assume 70kg body weight unless specified. "
                    "If duration is not stated, make a reasonable estimate based on typical sessions."
                ),
            },
            {
                "role": "user",
                "content": (
                    f'Analyze this exercise description: "{description}"\n\n'
                    "Return ONLY a JSON object with these keys:\n"
                    '- "exercise_type": string (e.g. "badminton", "walking", "weight_training", "running", "cycling", "swimming", "yoga", "other")\n'
                    '- "duration_minutes": number (estimated total duration)\n'
                    '- "calories_burned": number (estimated calories burned)\n'
                    '- "intensity": one of "low", "moderate", "high", "vigorous"\n'
                    '- "muscle_groups": list of strings (primary muscles worked)\n'
                    '- "analysis": 2-3 sentence summary of the exercise session\n'
                    '- "recovery_advice": 1-2 sentence recovery tip\n'
                    '- "health_benefits": list of 3-5 short health benefit strings\n\n'
                    "Return ONLY the JSON object, no other text."
                ),
            },
        ],
        max_tokens=1000,
    )

    content = response.choices[0].message.content.strip()
    result = _extract_json(content)

    result.setdefault("exercise_type", "other")
    result.setdefault("duration_minutes", 30)
    result.setdefault("calories_burned", 150)
    result.setdefault("intensity", "moderate")
    result.setdefault("muscle_groups", [])
    result.setdefault("analysis", "")
    result.setdefault("recovery_advice", "")
    result.setdefault("health_benefits", [])

    return result


async def analyze_watch_image(image_path: str) -> dict:
    """Use GPT-4o Vision to read step count from a watch/fitness tracker photo."""
    client = _get_client()

    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    ext = image_path.rsplit(".", 1)[-1].lower()
    mime_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp", "gif": "gif"}
    mime_type = f"image/{mime_map.get(ext, 'jpeg')}"

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert at reading fitness tracker and smartwatch displays. "
                    "Extract the step count and any other visible metrics from the display."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Read this fitness tracker / smartwatch display and extract data.\n\n"
                            "Return ONLY a JSON object with these keys:\n"
                            '- "step_count": integer (the step count shown on the display)\n'
                            '- "confidence": one of "high", "medium", "low" (how confident you are in the reading)\n'
                            '- "heart_rate": integer or null (if visible)\n'
                            '- "calories": integer or null (if visible)\n'
                            '- "distance_km": float or null (if visible)\n'
                            '- "raw_text": string (all text visible on the display)\n\n'
                            "Return ONLY the JSON object, no other text."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}",
                        },
                    },
                ],
            },
        ],
        max_tokens=500,
    )

    content = response.choices[0].message.content.strip()
    result = _extract_json(content)

    result.setdefault("step_count", 0)
    result.setdefault("confidence", "low")
    result.setdefault("heart_rate", None)
    result.setdefault("calories", None)
    result.setdefault("distance_km", None)
    result.setdefault("raw_text", "")

    return result


async def analyze_body_metric(description: str) -> dict:
    """Extract body metrics (weight, waist) from natural language description."""
    client = _get_client()

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You extract body measurement data from natural language. "
                    "Default units: kg for weight, cm for waist. "
                    "A single description can contain multiple metrics (e.g. weight AND waist)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f'Extract body metrics from: "{description}"\n\n'
                    "Return ONLY a JSON object with this key:\n"
                    '- "metrics": a list of objects, each with:\n'
                    '    - "metric_type": one of "weight", "waist"\n'
                    '    - "value": number\n'
                    '    - "unit": string (kg, lbs, cm, inches)\n'
                    '    - "notes": any extra context from the description\n\n'
                    "Return ONLY the JSON object, no other text."
                ),
            },
        ],
        max_tokens=500,
    )

    content = response.choices[0].message.content.strip()
    result = _extract_json(content)

    result.setdefault("metrics", [])

    return result


async def describe_habit_image(image_path: str, habit_name: str) -> str:
    """Use GPT-4o Vision to summarize what the user logged for a descriptive habit."""
    client = _get_client()

    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    ext = image_path.rsplit(".", 1)[-1].lower()
    mime_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp", "gif": "gif"}
    mime_type = f"image/{mime_map.get(ext, 'jpeg')}"

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    f"The user is logging their daily habit: '{habit_name}'. "
                    "They uploaded an image as evidence or a note for what they did. "
                    "Write a brief 1-2 sentence summary of what the image shows, "
                    "in the context of this habit. Be concise and descriptive."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Describe what I did for my '{habit_name}' habit today."},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{image_data}"},
                    },
                ],
            },
        ],
        max_tokens=200,
    )

    return response.choices[0].message.content.strip()


async def classify_voice_input(transcription: str, habits: list, todo_habits: list) -> dict:
    """Classify voice input intent and extract relevant data."""
    client = _get_client()

    habit_names = ", ".join([f'"{h["name"]}" (id={h["id"]})' for h in habits])
    todo_names = ", ".join([f'"{h["name"]}" (id={h["id"]})' for h in todo_habits])

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an intelligent voice command classifier for a health tracking app. "
                    "The user speaks a voice command. Classify it into one of these categories:\n\n"
                    "1. 'food' — logging food/meals (e.g. 'I had 2 rotis and dal for lunch', 'ate a banana')\n"
                    "2. 'exercise' — logging exercise/workout (e.g. 'I did 30 minutes of running', 'played badminton for an hour')\n"
                    "3. 'steps' — updating step count (e.g. 'I walked 10000 steps today', '8500 steps')\n"
                    "4. 'body_metric' — logging weight/waist/biceps (e.g. 'my weight is 72 kg', 'waist 32 inches')\n"
                    "5. 'habit_log' — logging a descriptive habit (e.g. 'for gratitude log: I am grateful for...', 'system design: studied LRU cache')\n"
                    "6. 'todo' — adding a todo item (e.g. 'add todo: buy groceries', 'remind me to call doctor', 'add task: finish report')\n"
                    "7. 'note' — adding a personal note (e.g. 'note: meeting went well today', 'journal entry about...')\n"
                    "8. 'reminder' — setting a reminder with a specific time (e.g. 'remind me at 3pm to take medicine', 'set reminder for 6:30 to go for a walk')\n\n"
                    f"Available descriptive habits: [{habit_names}]\n"
                    f"Available todo habits: [{todo_names}]\n\n"
                    "Return ONLY a JSON object with:\n"
                    '- "category": one of the above categories\n'
                    '- "content": the relevant content/description extracted from the voice input\n'
                    '- "habit_id": integer habit ID if category is habit_log or todo (match to closest habit name), or null\n'
                    '- "habit_name": matched habit name if applicable, or null\n'
                    '- "reminder_time": time string in HH:MM (24h) format if category is reminder, or null\n'
                    '- "reminder_text": the reminder message if category is reminder, or null\n'
                    '- "todo_habit_id": integer todo habit ID if category is todo (pick the most relevant todo habit), or null\n\n'
                    "Be smart about classification. If someone says 'I did system design today - studied consistent hashing', "
                    "and there's a 'System Design' descriptive habit, classify it as habit_log. "
                    "If someone says 'add buy milk to my todo', classify as todo. "
                    "If someone says 'remind me at 5pm to drink water', classify as reminder.\n\n"
                    "Return ONLY the JSON object."
                ),
            },
            {"role": "user", "content": transcription},
        ],
        temperature=0.2,
        max_tokens=500,
    )

    content = response.choices[0].message.content.strip()
    result = _extract_json(content)

    result.setdefault("category", "note")
    result.setdefault("content", transcription)
    result.setdefault("habit_id", None)
    result.setdefault("habit_name", None)
    result.setdefault("reminder_time", None)
    result.setdefault("reminder_text", None)
    result.setdefault("todo_habit_id", None)

    return result


async def generate_tts(text: str, output_path: str) -> str:
    """Generate TTS audio file using OpenAI TTS API."""
    client = _get_client()
    response = client.audio.speech.create(
        model="tts-1",
        voice="alloy",
        input=text,
    )
    response.stream_to_file(output_path)
    return output_path

