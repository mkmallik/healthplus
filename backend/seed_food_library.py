"""Seed the food_library table with ~120 common foods. Idempotent — skips existing entries."""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models import FoodLibrary

# Ensure table exists
Base.metadata.create_all(bind=engine)

# Format: (name, aliases, cal, protein, carbs, fat, fiber, sugar, sodium, category, serving_g)
FOODS = [
    # === Indian Staples (~30) ===
    ("Roti (Chapati)", ["chapati", "phulka", "Indian flatbread"], 297, 9.0, 56.0, 3.5, 2.5, 2.0, 410, "indian", 100),
    ("Naan", ["garlic naan", "butter naan"], 310, 9.0, 53.0, 7.0, 2.0, 3.0, 520, "indian", 100),
    ("Plain Rice (Cooked)", ["steamed rice", "chawal", "white rice"], 130, 2.7, 28.0, 0.3, 0.4, 0.1, 1, "indian", 100),
    ("Basmati Rice (Cooked)", ["basmati", "pulao rice"], 135, 3.0, 29.0, 0.4, 0.5, 0.1, 2, "indian", 100),
    ("Dal Tadka", ["yellow dal", "toor dal", "lentil curry"], 120, 7.0, 16.0, 3.5, 3.0, 1.5, 350, "indian", 100),
    ("Rajma (Kidney Bean Curry)", ["rajma chawal", "kidney beans"], 125, 7.5, 18.0, 2.5, 5.0, 2.0, 380, "indian", 100),
    ("Chole (Chickpea Curry)", ["chana masala", "chickpea curry"], 150, 7.0, 20.0, 5.0, 5.5, 3.0, 400, "indian", 100),
    ("Paneer Butter Masala", ["paneer makhani", "butter paneer"], 220, 11.0, 10.0, 16.0, 1.0, 4.0, 450, "indian", 100),
    ("Palak Paneer", ["spinach paneer", "saag paneer"], 170, 10.0, 7.0, 12.0, 2.5, 2.0, 380, "indian", 100),
    ("Aloo Gobi", ["potato cauliflower", "gobi aloo"], 110, 3.0, 14.0, 5.0, 3.0, 3.0, 300, "indian", 100),
    ("Samosa", ["aloo samosa", "vegetable samosa"], 260, 5.0, 30.0, 14.0, 2.5, 2.0, 420, "indian", 100),
    ("Dosa", ["masala dosa", "plain dosa"], 165, 4.0, 25.0, 5.5, 1.0, 1.0, 300, "indian", 100),
    ("Idli", ["steamed idli", "rice cake"], 120, 3.5, 22.0, 1.5, 0.8, 0.5, 280, "indian", 100),
    ("Upma", ["rava upma", "sooji upma"], 145, 4.0, 20.0, 5.5, 1.5, 1.0, 350, "indian", 100),
    ("Biryani (Chicken)", ["hyderabadi biryani", "chicken biryani"], 195, 12.0, 22.0, 6.5, 1.0, 1.5, 380, "indian", 100),
    ("Biryani (Vegetable)", ["veg biryani", "pulao biryani"], 160, 4.0, 24.0, 5.0, 2.0, 2.0, 350, "indian", 100),
    ("Butter Chicken", ["murgh makhani", "chicken makhani"], 195, 15.0, 8.0, 12.0, 0.8, 3.0, 470, "indian", 100),
    ("Tandoori Chicken", ["grilled tandoori", "chicken tandoori"], 165, 25.0, 3.0, 6.0, 0.3, 1.0, 500, "indian", 100),
    ("Chicken Tikka", ["tikka kebab"], 175, 24.0, 4.0, 7.0, 0.5, 1.5, 480, "indian", 100),
    ("Fish Curry", ["machhi curry", "meen curry"], 140, 16.0, 5.0, 6.5, 0.5, 1.5, 400, "indian", 100),
    ("Raita", ["cucumber raita", "boondi raita"], 60, 3.0, 5.0, 3.0, 0.3, 4.0, 200, "indian", 100),
    ("Paratha (Plain)", ["plain paratha", "layered paratha"], 320, 7.0, 42.0, 14.0, 2.0, 1.5, 400, "indian", 100),
    ("Aloo Paratha", ["stuffed paratha", "potato paratha"], 290, 6.0, 38.0, 12.5, 2.5, 2.0, 380, "indian", 100),
    ("Poha", ["flattened rice", "beaten rice"], 160, 3.5, 28.0, 4.0, 1.5, 2.0, 320, "indian", 100),
    ("Pav Bhaji", ["mumbai pav bhaji"], 220, 6.0, 28.0, 10.0, 3.0, 5.0, 450, "indian", 100),
    ("Kheer", ["rice pudding", "payasam"], 150, 4.0, 22.0, 5.5, 0.2, 16.0, 80, "indian", 100),
    ("Gulab Jamun", ["gulab jamun sweet"], 325, 4.0, 45.0, 15.0, 0.3, 35.0, 100, "indian", 100),
    ("Jalebi", ["jalebi sweet"], 390, 2.0, 58.0, 17.0, 0.1, 40.0, 50, "indian", 100),
    ("Lassi (Sweet)", ["mango lassi", "punjabi lassi"], 95, 3.5, 14.0, 2.5, 0, 12.0, 50, "indian", 100),
    ("Masala Chai", ["chai tea", "Indian tea"], 45, 1.5, 6.0, 1.5, 0, 5.0, 30, "indian", 100),

    # === Proteins ===
    ("Chicken Breast (Cooked)", ["grilled chicken", "baked chicken breast"], 165, 31.0, 0, 3.6, 0, 0, 74, "protein", 100),
    ("Chicken Thigh (Cooked)", ["roasted chicken thigh"], 209, 26.0, 0, 10.9, 0, 0, 84, "protein", 100),
    ("Salmon (Cooked)", ["baked salmon", "grilled salmon"], 208, 20.0, 0, 13.0, 0, 0, 59, "protein", 100),
    ("Tuna (Canned)", ["canned tuna", "tuna fish"], 116, 26.0, 0, 0.8, 0, 0, 330, "protein", 100),
    ("Eggs (Whole, Boiled)", ["boiled egg", "hard-boiled egg"], 155, 13.0, 1.1, 11.0, 0, 1.1, 124, "protein", 50),
    ("Egg White (Boiled)", ["egg whites"], 52, 11.0, 0.7, 0.2, 0, 0.7, 166, "protein", 100),
    ("Paneer", ["cottage cheese", "Indian cheese"], 265, 18.0, 3.0, 20.0, 0, 1.0, 20, "protein", 100),
    ("Tofu (Firm)", ["soy tofu", "bean curd"], 144, 15.0, 3.0, 8.0, 1.5, 0.6, 14, "protein", 100),
    ("Greek Yogurt", ["strained yogurt"], 97, 9.0, 3.6, 5.0, 0, 3.2, 47, "protein", 100),
    ("Whey Protein Scoop", ["protein shake", "whey shake"], 120, 24.0, 3.0, 1.5, 0.5, 1.0, 150, "protein", 30),
    ("Prawns (Cooked)", ["shrimp", "grilled prawns"], 99, 24.0, 0.2, 0.3, 0, 0, 111, "protein", 100),
    ("Turkey Breast", ["roasted turkey"], 135, 30.0, 0, 1.0, 0, 0, 60, "protein", 100),

    # === Grains & Cereals ===
    ("Oats (Dry)", ["rolled oats", "oatmeal"], 389, 17.0, 66.0, 7.0, 10.0, 1.0, 2, "grains", 100),
    ("Quinoa (Cooked)", ["cooked quinoa"], 120, 4.4, 21.0, 1.9, 2.8, 0.9, 7, "grains", 100),
    ("Brown Rice (Cooked)", ["whole grain rice"], 123, 2.7, 26.0, 1.0, 1.8, 0.4, 4, "grains", 100),
    ("Whole Wheat Bread", ["brown bread", "whole grain bread"], 252, 12.0, 43.0, 3.5, 6.0, 5.0, 450, "grains", 100),
    ("White Bread", ["sandwich bread"], 265, 9.0, 49.0, 3.2, 2.7, 5.0, 490, "grains", 100),
    ("Pasta (Cooked)", ["spaghetti", "penne", "macaroni"], 131, 5.0, 25.0, 1.1, 1.8, 0.6, 1, "grains", 100),
    ("Whole Wheat Pasta (Cooked)", ["brown pasta"], 124, 5.3, 24.0, 0.5, 3.2, 0.6, 3, "grains", 100),
    ("Muesli", ["granola", "cereal mix"], 370, 10.0, 65.0, 7.0, 6.0, 20.0, 200, "grains", 100),
    ("Cornflakes", ["corn flakes", "breakfast cereal"], 357, 7.0, 84.0, 0.4, 3.3, 8.0, 730, "grains", 100),

    # === Fruits ===
    ("Apple", ["green apple", "red apple"], 52, 0.3, 14.0, 0.2, 2.4, 10.0, 1, "fruits", 100),
    ("Banana", ["ripe banana"], 89, 1.1, 23.0, 0.3, 2.6, 12.0, 1, "fruits", 100),
    ("Orange", ["mandarin", "citrus"], 47, 0.9, 12.0, 0.1, 2.4, 9.0, 0, "fruits", 100),
    ("Mango", ["aam", "alphonso"], 60, 0.8, 15.0, 0.4, 1.6, 14.0, 1, "fruits", 100),
    ("Grapes", ["green grapes", "red grapes"], 69, 0.7, 18.0, 0.2, 0.9, 16.0, 2, "fruits", 100),
    ("Watermelon", ["tarbooz"], 30, 0.6, 8.0, 0.2, 0.4, 6.0, 1, "fruits", 100),
    ("Papaya", ["pawpaw"], 43, 0.5, 11.0, 0.3, 1.7, 8.0, 8, "fruits", 100),
    ("Pineapple", ["ananas"], 50, 0.5, 13.0, 0.1, 1.4, 10.0, 1, "fruits", 100),
    ("Strawberries", ["fresh strawberry"], 32, 0.7, 7.7, 0.3, 2.0, 4.9, 1, "fruits", 100),
    ("Blueberries", ["fresh blueberry"], 57, 0.7, 14.0, 0.3, 2.4, 10.0, 1, "fruits", 100),
    ("Pomegranate", ["anaar"], 83, 1.7, 19.0, 1.2, 4.0, 14.0, 3, "fruits", 100),
    ("Guava", ["amrood"], 68, 2.6, 14.0, 1.0, 5.4, 9.0, 2, "fruits", 100),

    # === Vegetables ===
    ("Broccoli", ["steamed broccoli"], 34, 2.8, 7.0, 0.4, 2.6, 1.7, 33, "vegetables", 100),
    ("Spinach (Raw)", ["palak", "baby spinach"], 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79, "vegetables", 100),
    ("Sweet Potato", ["shakarkandi"], 86, 1.6, 20.0, 0.1, 3.0, 4.2, 55, "vegetables", 100),
    ("Potato (Boiled)", ["boiled aloo"], 87, 1.9, 20.0, 0.1, 1.8, 0.8, 6, "vegetables", 100),
    ("Carrot", ["gajar"], 41, 0.9, 10.0, 0.2, 2.8, 4.7, 69, "vegetables", 100),
    ("Tomato", ["tamatar"], 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, "vegetables", 100),
    ("Cucumber", ["kheera"], 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2, "vegetables", 100),
    ("Bell Pepper", ["capsicum", "shimla mirch"], 31, 1.0, 6.0, 0.3, 2.1, 4.2, 3, "vegetables", 100),
    ("Onion", ["pyaaz"], 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4, "vegetables", 100),
    ("Cauliflower", ["phool gobi"], 25, 1.9, 5.0, 0.3, 2.0, 1.9, 30, "vegetables", 100),
    ("Green Beans", ["french beans"], 31, 1.8, 7.0, 0.1, 3.4, 1.4, 6, "vegetables", 100),
    ("Mushrooms", ["button mushroom"], 22, 3.1, 3.3, 0.3, 1.0, 2.0, 5, "vegetables", 100),
    ("Corn (Boiled)", ["sweet corn", "bhutta"], 96, 3.4, 21.0, 1.5, 2.4, 4.5, 1, "vegetables", 100),
    ("Avocado", ["butter fruit"], 160, 2.0, 9.0, 15.0, 7.0, 0.7, 7, "vegetables", 100),

    # === Dairy ===
    ("Whole Milk", ["full cream milk", "doodh"], 61, 3.2, 4.8, 3.3, 0, 5.0, 43, "dairy", 100),
    ("Skim Milk", ["low fat milk", "toned milk"], 34, 3.4, 5.0, 0.1, 0, 5.0, 42, "dairy", 100),
    ("Cheddar Cheese", ["cheese slice"], 403, 25.0, 1.3, 33.0, 0, 0.5, 621, "dairy", 100),
    ("Mozzarella", ["pizza cheese"], 280, 28.0, 3.1, 17.0, 0, 1.0, 616, "dairy", 100),
    ("Butter", ["makhan"], 717, 0.9, 0.1, 81.0, 0, 0.1, 11, "dairy", 100),
    ("Ghee", ["clarified butter"], 900, 0, 0, 100.0, 0, 0, 0, "dairy", 100),
    ("Cottage Cheese (Low-fat)", ["low fat paneer"], 98, 11.0, 3.4, 4.3, 0, 2.7, 364, "dairy", 100),
    ("Curd (Dahi)", ["plain yogurt", "dahi"], 60, 3.5, 5.0, 3.0, 0, 5.0, 46, "dairy", 100),

    # === Nuts & Seeds ===
    ("Almonds", ["badam"], 579, 21.0, 22.0, 50.0, 12.5, 4.0, 1, "nuts", 100),
    ("Cashews", ["kaju"], 553, 18.0, 30.0, 44.0, 3.3, 6.0, 12, "nuts", 100),
    ("Peanuts", ["moongfali", "groundnuts"], 567, 26.0, 16.0, 49.0, 8.5, 4.0, 18, "nuts", 100),
    ("Walnuts", ["akhrot"], 654, 15.0, 14.0, 65.0, 6.7, 2.6, 2, "nuts", 100),
    ("Chia Seeds", ["sabja seeds"], 486, 17.0, 42.0, 31.0, 34.0, 0, 16, "nuts", 100),
    ("Flax Seeds", ["alsi"], 534, 18.0, 29.0, 42.0, 27.0, 1.6, 30, "nuts", 100),
    ("Peanut Butter", ["PB"], 588, 25.0, 20.0, 50.0, 6.0, 9.0, 410, "nuts", 100),

    # === Snacks ===
    ("Protein Bar", ["energy bar", "fitness bar"], 350, 20.0, 40.0, 12.0, 5.0, 18.0, 200, "snacks", 60),
    ("Dark Chocolate (70%)", ["dark chocolate"], 598, 8.0, 46.0, 43.0, 11.0, 24.0, 20, "snacks", 100),
    ("Trail Mix", ["mixed nuts and dried fruits"], 462, 14.0, 44.0, 29.0, 5.0, 30.0, 100, "snacks", 100),
    ("Popcorn (Air-popped)", ["plain popcorn"], 375, 12.0, 74.0, 4.0, 15.0, 0.9, 4, "snacks", 100),
    ("Rice Cakes", ["puffed rice cakes"], 387, 8.0, 82.0, 3.0, 4.0, 0.3, 290, "snacks", 100),
    ("Banana Chips", ["kela chips"], 519, 2.0, 58.0, 34.0, 6.0, 35.0, 6, "snacks", 100),
    ("Murukku", ["chakli", "namkeen"], 480, 7.0, 55.0, 26.0, 3.0, 2.0, 500, "snacks", 100),

    # === Global Dishes ===
    ("Pizza Margherita (1 slice)", ["cheese pizza", "pizza slice"], 250, 11.0, 30.0, 10.0, 1.5, 3.0, 550, "global", 100),
    ("Burger (Beef Patty)", ["hamburger", "cheeseburger"], 295, 17.0, 24.0, 14.0, 1.3, 5.0, 500, "global", 100),
    ("French Fries", ["chips", "potato fries"], 312, 3.4, 41.0, 15.0, 3.8, 0.3, 210, "global", 100),
    ("Caesar Salad", ["chicken caesar"], 127, 7.0, 7.0, 8.0, 1.5, 2.0, 350, "global", 100),
    ("Sushi (Salmon Nigiri)", ["salmon sushi"], 140, 8.0, 19.0, 3.0, 0.2, 3.0, 400, "global", 100),
    ("Fried Rice", ["chinese fried rice", "egg fried rice"], 163, 5.0, 24.0, 5.0, 1.0, 1.0, 450, "global", 100),
    ("Pad Thai", ["thai noodles"], 155, 6.0, 22.0, 5.0, 1.5, 5.0, 470, "global", 100),
    ("Tacos (Chicken)", ["chicken taco"], 210, 14.0, 20.0, 8.0, 2.0, 2.0, 450, "global", 100),
    ("Hummus", ["chickpea dip"], 166, 8.0, 14.0, 10.0, 6.0, 0.3, 379, "global", 100),
    ("Falafel", ["chickpea patty"], 333, 13.0, 32.0, 18.0, 5.0, 3.0, 580, "global", 100),
    ("Steak (Grilled)", ["beef steak", "sirloin"], 271, 26.0, 0, 18.0, 0, 0, 54, "global", 100),
    ("Pasta Alfredo", ["fettuccine alfredo"], 180, 7.0, 18.0, 9.0, 1.0, 2.0, 350, "global", 100),

    # === Beverages ===
    ("Black Coffee", ["espresso", "americano"], 2, 0.3, 0, 0, 0, 0, 5, "beverages", 240),
    ("Green Tea", ["matcha tea"], 1, 0, 0.2, 0, 0, 0, 1, "beverages", 240),
    ("Orange Juice", ["fresh OJ"], 45, 0.7, 10.0, 0.2, 0.2, 8.4, 1, "beverages", 100),
    ("Coconut Water", ["nariyal pani"], 19, 0.7, 3.7, 0.2, 1.1, 2.6, 105, "beverages", 100),
    ("Cola (Regular)", ["pepsi", "coca cola", "soft drink"], 42, 0, 10.6, 0, 0, 10.6, 4, "beverages", 100),
    ("Protein Shake (Whey)", ["protein smoothie"], 80, 16.0, 4.0, 1.0, 0, 2.0, 100, "beverages", 200),

    # === Legumes ===
    ("Moong Dal (Cooked)", ["green gram dal", "mung bean"], 105, 7.0, 15.0, 1.5, 4.0, 1.5, 250, "legumes", 100),
    ("Chana Dal (Cooked)", ["bengal gram", "split chickpea"], 130, 8.0, 18.0, 3.0, 5.0, 2.0, 280, "legumes", 100),
    ("Black Beans (Cooked)", ["kala chana", "black gram"], 132, 9.0, 24.0, 0.5, 8.0, 0.3, 1, "legumes", 100),
    ("Soybean (Cooked)", ["edamame"], 141, 12.0, 11.0, 6.0, 5.0, 3.0, 14, "legumes", 100),
    ("Sprouts (Mixed)", ["bean sprouts", "moong sprouts"], 31, 3.0, 6.0, 0.2, 1.8, 4.0, 6, "legumes", 100),
]


def seed():
    db = SessionLocal()
    added = 0
    skipped = 0
    try:
        for name, aliases, cal, prot, carbs, fat, fiber, sugar, sodium, cat, serving in FOODS:
            exists = db.query(FoodLibrary).filter(FoodLibrary.name == name).first()
            if exists:
                skipped += 1
                continue
            item = FoodLibrary(
                name=name,
                aliases=json.dumps(aliases),
                calories_per_100g=cal,
                protein_per_100g=prot,
                carbs_per_100g=carbs,
                fat_per_100g=fat,
                fiber_per_100g=fiber,
                sugar_per_100g=sugar,
                sodium_per_100g=sodium,
                category=cat,
                serving_size_g=serving,
            )
            db.add(item)
            added += 1
        db.commit()
        print(f"Seeded {added} foods, skipped {skipped} existing entries.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
