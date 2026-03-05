"use client";

import Link from "next/link";
import { Camera, Type, Mic, Dumbbell, Footprints, Scale, ListChecks } from "lucide-react";

const LOG_CARDS = [
  {
    href: "/log/food-image",
    label: "Scan Food",
    description: "Take a photo of your meal",
    icon: Camera,
    color: "#4CAF50",
  },
  {
    href: "/log/food-text",
    label: "Type Food",
    description: "Describe what you ate",
    icon: Type,
    color: "#FF9800",
  },
  {
    href: "/log/food-voice",
    label: "Voice Log",
    description: "Speak what you ate",
    icon: Mic,
    color: "#9C27B0",
  },
  {
    href: "/log/exercise",
    label: "Exercise",
    description: "Log your workout",
    icon: Dumbbell,
    color: "#E91E63",
  },
  {
    href: "/log/steps",
    label: "Steps",
    description: "Record your step count",
    icon: Footprints,
    color: "#00ACC1",
  },
  {
    href: "/log/body-metrics",
    label: "Body Metrics",
    description: "Track weight, waist, biceps",
    icon: Scale,
    color: "#795548",
  },
  {
    href: "/habits",
    label: "Habits",
    description: "Track your daily habits",
    icon: ListChecks,
    color: "#673AB7",
  },
];

export default function LogHubPage() {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl font-bold text-text mb-2">Log</h1>
      <p className="text-sm text-text-secondary mb-6">
        What would you like to log today?
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {LOG_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex flex-col items-center gap-3 rounded-xl bg-surface p-5 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-border"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: card.color + "15" }}
              >
                <Icon className="h-6 w-6" style={{ color: card.color }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text">{card.label}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{card.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
