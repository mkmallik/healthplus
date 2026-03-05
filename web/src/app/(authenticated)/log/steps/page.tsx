"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Footprints } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/Toast";
import { COLORS } from "@/lib/constants";

export default function StepsLogPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [stepCount, setStepCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const count = parseInt(stepCount, 10);
    if (!count || count <= 0) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("step_count", String(count));

      await api.post("/steps/log", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast(`${count.toLocaleString()} steps logged!`, "success");
      router.push("/home");
    } catch {
      showToast("Failed to log steps. Please try again.", "error");
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

      <h1 className="text-2xl font-bold text-text mb-2">Log Steps</h1>
      <p className="text-sm text-text-secondary mb-6">
        Enter your step count for today. Logging again will update today&apos;s entry.
      </p>

      {/* Step Count Input */}
      <div className="mb-6 rounded-xl bg-surface p-6 shadow-sm">
        <label className="mb-3 block text-sm font-semibold text-text">Step Count</label>
        <input
          type="number"
          value={stepCount}
          onChange={(e) => setStepCount(e.target.value)}
          placeholder="e.g. 8500"
          maxLength={6}
          className="w-full rounded-lg border border-border bg-white px-4 py-4 text-center text-3xl font-bold text-text outline-none transition-colors focus:border-steps"
          style={{ caretColor: COLORS.steps }}
        />
        {stepCount && parseInt(stepCount, 10) > 0 && (
          <p className="mt-3 text-center text-sm text-text-secondary">
            {parseInt(stepCount, 10).toLocaleString()} steps
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!stepCount || parseInt(stepCount, 10) <= 0 || submitting}
        className="w-full rounded-lg py-3 text-base font-semibold text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: submitting ? "#00838F" : COLORS.steps }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Saving...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Footprints className="h-5 w-5" />
            Save Steps
          </span>
        )}
      </button>
    </div>
  );
}
