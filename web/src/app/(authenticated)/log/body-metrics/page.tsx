"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Scale, Check } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/Toast";
import { METRIC_LABELS, METRIC_COLORS, COLORS } from "@/lib/constants";
import AudioRecorder from "@/components/AudioRecorder";
import type { BodyMetricEntry } from "@/lib/types";

const METRIC_TYPES = ["weight", "waist", "biceps"];
const PLACEHOLDERS: Record<string, string> = {
  weight: "e.g. 72.5 kg or I weigh 160 lbs",
  waist: "e.g. 32 inches or waist is 82 cm",
  biceps: "e.g. 14 inches or biceps are 36 cm",
};

export default function BodyMetricsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [metricType, setMetricType] = useState("weight");
  const [description, setDescription] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<BodyMetricEntry[] | null>(null);

  const handleSubmit = async () => {
    if (!description.trim() && !audioBlob) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      if (description.trim()) formData.append("description", description.trim());
      if (audioBlob) formData.append("audio", audioBlob, "recording.webm");

      const res = await api.post("/body-metrics/log", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResults(res.data);
      showToast("Body metrics logged!", "success");
    } catch {
      showToast("Failed to log metrics. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (results) {
    return (
      <div className="mx-auto max-w-lg p-4 md:p-6">
        <div className="mb-6 flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-text">Metrics Logged!</h1>
        </div>

        <div className="space-y-3 mb-6">
          {results.map((m) => (
            <div
              key={m.id}
              className="rounded-xl bg-surface p-4 shadow-sm flex items-center gap-4"
              style={{ borderLeft: `4px solid ${METRIC_COLORS[m.metric_type] || COLORS.primary}` }}
            >
              <div>
                <p className="text-xs font-medium text-text-secondary uppercase">
                  {METRIC_LABELS[m.metric_type] || m.metric_type}
                </p>
                <p className="text-2xl font-bold text-text">
                  {m.value} <span className="text-sm font-normal text-text-secondary">{m.unit}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setResults(null);
              setDescription("");
              setAudioBlob(null);
            }}
            className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-center text-sm font-semibold text-text hover:bg-surface-2 transition-colors"
          >
            Log Another
          </button>
          <button
            onClick={() => router.push("/home")}
            className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4 md:p-6">
      <button
        onClick={() => router.push("/log")}
        className="mb-4 flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Log
      </button>

      <h1 className="text-2xl font-bold text-text mb-2">Body Metrics</h1>
      <p className="text-sm text-text-secondary mb-6">
        Track your weight, waist, and biceps measurements.
      </p>

      {/* Metric Type */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-text">Metric Type</label>
        <div className="flex gap-2">
          {METRIC_TYPES.map((mt) => (
            <button
              key={mt}
              onClick={() => setMetricType(mt)}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                metricType === mt
                  ? "text-white"
                  : "bg-surface border border-border text-text-secondary hover:border-text-secondary"
              }`}
              style={metricType === mt ? { backgroundColor: METRIC_COLORS[mt] } : undefined}
            >
              {METRIC_LABELS[mt]}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-text">
          Describe your measurement
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={PLACEHOLDERS[metricType]}
          maxLength={200}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-colors focus:border-primary resize-none"
        />
        <p className="mt-1 text-xs text-text-secondary text-right">{description.length}/200</p>
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
        style={{ backgroundColor: submitting ? "#5D4037" : COLORS.weight }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Analyzing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Scale className="h-5 w-5" />
            Log Metrics
          </span>
        )}
      </button>
    </div>
  );
}
