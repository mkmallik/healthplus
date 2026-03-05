"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/Toast";
import { MEAL_LABELS } from "@/lib/constants";
import AudioRecorder from "@/components/AudioRecorder";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export default function FoodTextPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim() && !audioBlob) return;
    setAnalyzing(true);

    try {
      const formData = new FormData();
      if (text.trim()) {
        formData.append("description", text.trim());
      }
      formData.append("meal_type", mealType);
      if (audioBlob) {
        formData.append("audio", audioBlob, "recording.webm");
      }

      const res = await api.post("/food/log-text", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      sessionStorage.setItem("foodLogResult", JSON.stringify(res.data));
      router.push("/review");
    } catch {
      showToast("Analysis failed. Please try again.", "error");
    } finally {
      setAnalyzing(false);
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

      <h1 className="text-2xl font-bold text-text mb-2">Type Food</h1>
      <p className="text-sm text-text-secondary mb-6">
        Describe what you ate and we&apos;ll estimate the nutrition.
      </p>

      {/* Meal Type Selector */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-text">Meal Type</label>
        <div className="flex gap-2 flex-wrap">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              onClick={() => setMealType(mt)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mealType === mt
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-text-secondary hover:border-primary"
              }`}
            >
              {MEAL_LABELS[mt]}
            </button>
          ))}
        </div>
      </div>

      {/* Text Input */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-text">
          What did you eat?
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 2 roti with dal, a bowl of rice, a glass of buttermilk"
          maxLength={500}
          rows={4}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors focus:border-primary resize-none"
        />
        <p className="mt-1 text-xs text-text-secondary text-right">{text.length}/500</p>
      </div>

      {/* Audio */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-text">
          Voice Description (optional)
        </label>
        <AudioRecorder onRecorded={setAudioBlob} />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={(!text.trim() && !audioBlob) || analyzing}
        className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {analyzing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Analyzing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Send className="h-5 w-5" />
            Analyze Food
          </span>
        )}
      </button>
    </div>
  );
}
