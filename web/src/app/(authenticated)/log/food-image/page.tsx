"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Camera, X, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/Toast";
import AudioRecorder from "@/components/AudioRecorder";

export default function FoodImagePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      if (audioBlob) {
        formData.append("audio", audioBlob, "recording.webm");
      }

      const res = await api.post("/food/log", formData, {
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

      <h1 className="text-2xl font-bold text-text mb-2">Scan Food</h1>
      <p className="text-sm text-text-secondary mb-6">
        Upload a photo of your food and optionally add a voice description.
      </p>

      {!imagePreview ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-6 flex h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
            dragOver
              ? "border-primary bg-primary-light/30"
              : "border-border bg-surface hover:border-primary/50"
          }`}
        >
          <Upload className="mb-3 h-10 w-10 text-text-secondary" />
          <p className="text-sm font-medium text-text">
            Drop an image here or click to browse
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            JPG, PNG, HEIC supported
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        <div className="mb-6 relative">
          <img
            src={imagePreview}
            alt="Food preview"
            className="w-full rounded-xl object-cover max-h-80"
          />
          <button
            onClick={clearImage}
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-text">
          Voice Description (optional)
        </label>
        <AudioRecorder onRecorded={setAudioBlob} />
        <p className="mt-1.5 text-xs text-text-secondary">
          Describe what you&apos;re eating for more accurate analysis.
        </p>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!imageFile || analyzing}
        className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {analyzing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Analyzing...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Camera className="h-5 w-5" />
            Analyze Food
          </span>
        )}
      </button>
    </div>
  );
}
