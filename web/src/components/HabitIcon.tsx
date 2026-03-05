import {
  CheckCircle, Droplets, Bed, BookOpen, Leaf, Heart,
  Dumbbell, Bike, PersonStanding, Cross, Moon, Sun,
  Utensils, Scale, Footprints, Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const IONICON_TO_LUCIDE: Record<string, LucideIcon> = {
  "checkmark-circle": CheckCircle,
  "water": Droplets,
  "bed": Bed,
  "book": BookOpen,
  "leaf": Leaf,
  "heart": Heart,
  "barbell": Dumbbell,
  "bicycle": Bike,
  "walk": PersonStanding,
  "medkit": Cross,
  "moon": Moon,
  "sunny": Sun,
  // Default habits from backend
  "restaurant": Utensils,
  "scale-outline": Scale,
  "footsteps": Footprints,
  "fitness": Activity,
  // Aliases
  "checkmark-circle-outline": CheckCircle,
  "document-text-outline": BookOpen,
};

interface HabitIconProps {
  icon: string;
  size?: number;
  color?: string;
  className?: string;
}

export default function HabitIcon({ icon, size = 18, color, className }: HabitIconProps) {
  const LucideComponent = IONICON_TO_LUCIDE[icon];

  if (LucideComponent) {
    return (
      <LucideComponent
        style={{ width: size, height: size, color }}
        className={className}
      />
    );
  }

  // Fallback: render as emoji text if it's an emoji, otherwise show a default icon
  return (
    <span style={{ fontSize: size * 0.9, lineHeight: 1 }} className={className}>
      {icon}
    </span>
  );
}
