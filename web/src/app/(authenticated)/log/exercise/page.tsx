"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/Toast";
import { EXERCISE_TYPES } from "@/lib/constants";
import AudioRecorder from "@/components/AudioRecorder";

export default function ExerciseLogPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [exerciseType, setExerciseType] = useState("other");
  const [description, setDescription] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() && !audioBlob) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      const fullDesc = exerciseType !== "other"
        ? `${exerciseType}: ${description.trim()}`
        : description.trim();
      if (fullDesc) formData.append("description", fullDesc);
      if (audioBlob) formData.append("audio", audioBlob, "recording.webm");

      const res = await api.post("/exercise/log", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      sessionStorage.setItem("exerciseResult", JSON.stringify(res.data));
      router.push("/log/exercise/review");
    } catch {
      showToast("Failed to log exercise. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg p-4 md:p-6">
      <button
        onClick={() => router.push("/log")}
        className="mb-4 flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Log
      </button>

      <h1 className="text-2xl font-bold text-text mb-2">Log Exercise</h1>
      <p className="text-sm text-text-secondary mb-6">
        Describe your workout and we&apos;ll estimate calories burned.
      </p>

      {/* Exercise Type */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-text">Exercise Type</label>
        <div className="flex gap-2 flex-wrap">
          {EXERCISE_TYPES.map((et) => (
            <button
              key={et.key}
              onClick={() => setExerciseType(et.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                exerciseType === et.key
                  ? "bg-exercise text-white"
                  : "bg-surface border border-border text-text-secondary hover:border-exercise"
              }`}
            >
              <span>{et.icon}</span>
              {et.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-text">
          Describe your workout
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 30 minutes of weight training, chest and shoulders"
          maxLength={500}
          rows={4}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors focus:border-exercise resize-none"
        />
        <p className="mt-1 text-xs text-text-secondary text-right">{description.length}/500</p>
      </div>

      {/* Audio */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-text">
          Voice Description (optional)
        </label>
        <AudioRecorder onRecorded={setAudioBlob} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={(!description.trim() && !audioBlob) || submitting}
        className="w-full rounded-lg py-3 text-base font-semibold text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: submitting ? "#C2185B" : "#E91E63" }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Analyzing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Log Exercise
          </span>
        )}
      </button>
    </div>
  );
}
