"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Square, Trash2 } from "lucide-react";

interface AudioRecorderProps {
  onRecorded: (blob: Blob | null) => void;
}

export default function AudioRecorder({ onRecorded }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        onRecorded(blob);
        setHasRecording(true);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  }, [onRecorded]);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    setHasRecording(false);
    setDuration(0);
    onRecorded(null);
  }, [onRecorded]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3">
      {!recording && !hasRecording && (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-gray-50 transition-colors"
        >
          <Mic className="h-4 w-4" />
          Record Voice Note
        </button>
      )}

      {recording && (
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-error animate-pulse" />
          <span className="text-sm font-medium text-text tabular-nums">
            {formatTime(duration)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-medium text-white"
          >
            <Square className="h-3 w-3" />
            Stop
          </button>
        </div>
      )}

      {hasRecording && !recording && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">
            Recorded {formatTime(duration)}
          </span>
          <button
            type="button"
            onClick={clearRecording}
            className="flex items-center gap-1 text-sm text-error hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
