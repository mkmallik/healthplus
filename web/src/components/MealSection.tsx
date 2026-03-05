"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { COLORS, MEAL_LABELS } from "@/lib/constants";
import type { FoodItem } from "@/lib/types";

interface MealSectionProps {
  mealType: string;
  foods: FoodItem[];
  totalCalories: number;
}

export default function MealSection({
  mealType,
  foods,
  totalCalories,
}: MealSectionProps) {
  const [expanded, setExpanded] = useState(foods.length > 0);
  const mealColor = COLORS[mealType as keyof typeof COLORS] || COLORS.primary;

  return (
    <div className="mb-3 rounded-xl bg-surface p-4 shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3"
      >
        <div
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: mealColor }}
        />
        <span className="flex-1 text-left text-sm font-semibold text-text">
          {MEAL_LABELS[mealType] || mealType}
        </span>
        <span className="text-sm text-text-secondary mr-2">
          {Math.round(totalCalories)} kcal
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-secondary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        )}
      </button>

      {expanded && foods.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          {foods.map((food) => (
            <div
              key={food.id}
              className="flex items-center gap-3 py-2"
            >
              {food.image_path && (
                <img
                  src={`/uploads/${food.image_path}`}
                  alt={food.description || "Food"}
                  className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <span className="flex-1 text-sm text-text truncate">
                {food.description || "Food item"}
              </span>
              <span className="text-sm text-text-secondary flex-shrink-0">
                {Math.round(food.calories)} kcal
              </span>
            </div>
          ))}
        </div>
      )}

      {expanded && foods.length === 0 && (
        <p className="mt-3 text-center text-xs text-text-secondary">
          No items logged
        </p>
      )}
    </div>
  );
}
