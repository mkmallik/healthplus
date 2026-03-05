import type { FoodItem } from "@/lib/types";

interface NutritionCardProps {
  food: FoodItem;
}

const rows = [
  { label: "Calories", key: "calories" as const, unit: "kcal" },
  { label: "Protein", key: "protein" as const, unit: "g" },
  { label: "Carbs", key: "carbs" as const, unit: "g" },
  { label: "Fat", key: "fat" as const, unit: "g" },
  { label: "Fiber", key: "fiber" as const, unit: "g" },
  { label: "Sugar", key: "sugar" as const, unit: "g" },
  { label: "Sodium", key: "sodium" as const, unit: "mg" },
];

export default function NutritionCard({ food }: NutritionCardProps) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm">
      <h3 className="mb-4 text-base font-bold text-text">Nutrition Facts</h3>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between py-2.5"
          >
            <span className="text-sm text-text-secondary">{row.label}</span>
            <span className="text-sm font-semibold text-text">
              {Math.round(food[row.key])} {row.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
