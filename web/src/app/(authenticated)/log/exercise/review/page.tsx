"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Flame, Zap } from "lucide-react";
import { COLORS, INTENSITY_COLORS } from "@/lib/constants";
import type { ExerciseEntry } from "@/lib/types";

export default function ExerciseReviewPage() {
  const router = useRouter();
  const [entry, setEntry] = useState<ExerciseEntry | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("exerciseResult");
    if (stored) {
      setEntry(JSON.parse(stored));
    } else {
      router.replace("/log/exercise");
    }
  }, [router]);

  if (!entry) return null;

  const intensityColor = INTENSITY_COLORS[entry.intensity] || COLORS.exercise;

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
        <Check className="h-5 w-5" style={{ color: COLORS.exercise }} />
        <h1 className="text-xl font-bold text-text">Exercise Logged!</h1>
      </div>

      {/* Type Badge */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: COLORS.exercise }}
        >
          {entry.exercise_type.replace(/_/g, " ")}
        </span>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: intensityColor }}
        >
          {entry.intensity} intensity
        </span>
      </div>

      {/* Stats Grid */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface p-4 shadow-sm flex items-center gap-3">
          <Clock className="h-5 w-5 text-text-secondary" />
          <div>
            <p className="text-lg font-bold text-text">{entry.duration_minutes} min</p>
            <p className="text-xs text-text-secondary">Duration</p>
          </div>
        </div>
        <div className="rounded-xl bg-surface p-4 shadow-sm flex items-center gap-3">
          <Flame className="h-5 w-5" style={{ color: COLORS.calories }} />
          <div>
            <p className="text-lg font-bold" style={{ color: COLORS.calories }}>
              {Math.round(entry.calories_burned)}
            </p>
            <p className="text-xs text-text-secondary">Calories</p>
          </div>
        </div>
      </div>

      {/* Muscle Groups */}
      {entry.muscle_groups && entry.muscle_groups.length > 0 && (
        <div className="mb-4 rounded-xl bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4" style={{ color: COLORS.exercise }} />
            <h3 className="text-sm font-semibold text-text">Muscle Groups</h3>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {entry.muscle_groups.map((mg) => (
              <span
                key={mg}
                className="rounded-full px-2.5 py-1 text-xs font-medium bg-pink-50 text-pink-700"
              >
                {mg}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analysis */}
      {entry.analysis && (
        <div className="mb-4 rounded-xl bg-surface p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-text mb-2">Analysis</h3>
          <p className="text-sm text-text-secondary leading-relaxed">{entry.analysis}</p>
        </div>
      )}

      {/* Transcription */}
      {entry.transcription && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text mb-1">Voice Note</h3>
          <p className="text-sm text-text-secondary italic">&ldquo;{entry.transcription}&rdquo;</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/log"
          className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-center text-sm font-semibold text-text hover:bg-surface-2 transition-colors"
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
