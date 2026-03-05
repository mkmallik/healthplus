"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { COLORS, MEAL_LABELS } from "@/lib/constants";
import type { FoodItem, MultiFoodLogResponse } from "@/lib/types";
import NutritionCard from "@/components/NutritionCard";

export default function ReviewPage() {
  const router = useRouter();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [mealType, setMealType] = useState("");
  const [transcription, setTranscription] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem("foodLogResult");
    if (stored) {
      const data = JSON.parse(stored);
      // Handle both MultiFoodLogResponse and legacy FoodLogResponse
      if (data.foods && Array.isArray(data.foods)) {
        const parsed = data as MultiFoodLogResponse;
        setFoods(parsed.foods);
        setMealType(parsed.meal_type);
        setTranscription(parsed.transcription || "");
      } else if (data.food) {
        setFoods([data.food]);
        setMealType(data.meal_type);
        setTranscription(data.transcription || "");
      } else {
        router.replace("/log");
      }
    } else {
      router.replace("/log");
    }
  }, [router]);

  if (foods.length === 0) return null;

  const mealColor = COLORS[mealType as keyof typeof COLORS] || COLORS.primary;
  const selectedFood = foods[selectedIdx];
  const totalCalories = foods.reduce((s, f) => s + f.calories, 0);
  const totalProtein = foods.reduce((s, f) => s + f.protein, 0);
  const totalCarbs = foods.reduce((s, f) => s + f.carbs, 0);
  const totalFat = foods.reduce((s, f) => s + f.fat, 0);

  return (
    <div className="mx-auto max-w-lg p-4 md:p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6 flex items-center gap-2">
        <Check className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-text">Food Logged!</h1>
      </div>

      {/* Meal Type Badge */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: mealColor }}
        >
          {MEAL_LABELS[mealType] || mealType}
        </span>
        <span className="text-sm text-text-secondary">
          {foods.length} item{foods.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Food Image (first food with image) */}
      {selectedFood?.image_path && (
        <img
          src={`/uploads/${selectedFood.image_path}`}
          alt={selectedFood.description || "Food"}
          className="mb-4 w-full rounded-xl object-cover max-h-72"
        />
      )}

      {/* Totals Card (if multiple items) */}
      {foods.length > 1 && (
        <div className="mb-4 rounded-xl bg-surface p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-text mb-3">Total Nutrition</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-bold" style={{ color: COLORS.calories }}>{Math.round(totalCalories)}</p>
              <p className="text-xs text-text-secondary">kcal</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: COLORS.protein }}>{Math.round(totalProtein)}g</p>
              <p className="text-xs text-text-secondary">Protein</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: COLORS.carbs }}>{Math.round(totalCarbs)}g</p>
              <p className="text-xs text-text-secondary">Carbs</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: COLORS.fat }}>{Math.round(totalFat)}g</p>
              <p className="text-xs text-text-secondary">Fat</p>
            </div>
          </div>
        </div>
      )}

      {/* Item List */}
      {foods.length > 1 && (
        <div className="mb-4 rounded-xl bg-surface shadow-sm overflow-hidden">
          {foods.map((food, idx) => (
            <button
              key={food.id}
              onClick={() => setSelectedIdx(idx)}
              className={`w-full flex items-center justify-between px-4 py-3 border-b border-border last:border-0 text-left transition-colors ${
                idx === selectedIdx ? "bg-primary-light/30" : "hover:bg-gray-50"
              }`}
            >
              <span className="text-sm font-medium text-text truncate flex-1 mr-2">
                {food.description || `Item ${idx + 1}`}
              </span>
              <span className="text-sm text-text-secondary flex-shrink-0">
                {Math.round(food.calories)} kcal
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Voice Transcription */}
      {transcription && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text mb-1">Voice Note</h3>
          <p className="text-sm text-text-secondary italic">&ldquo;{transcription}&rdquo;</p>
        </div>
      )}

      {/* Selected Item Details */}
      {selectedFood && (
        <div className="mb-4">
          {foods.length > 1 && (
            <h3 className="text-sm font-semibold text-text mb-2">
              {selectedFood.description || `Item ${selectedIdx + 1}`}
            </h3>
          )}
          {foods.length === 1 && selectedFood.description && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-text mb-1">Description</h3>
              <p className="text-sm text-text-secondary">{selectedFood.description}</p>
            </div>
          )}
          <NutritionCard food={selectedFood} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/log"
          className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-center text-sm font-semibold text-text hover:bg-gray-50 transition-colors"
        >
          Log Another
        </Link>
        <Link
          href="/home"
          className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
