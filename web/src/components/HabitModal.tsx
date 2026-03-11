"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { HABIT_ICONS, HABIT_COLORS } from "@/lib/constants";
import HabitIcon from "@/components/HabitIcon";
import type { Habit } from "@/lib/types";

interface HabitModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: HabitFormData) => void;
  editHabit?: Habit | null;
}

export interface HabitFormData {
  name: string;
  icon: string;
  color: string;
  frequency: string;
  frequency_target: number;
  habit_type: string;
}

export default function HabitModal({ open, onClose, onSave, editHabit }: HabitModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(HABIT_ICONS[0]);
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState("daily");
  const [frequencyTarget, setFrequencyTarget] = useState(1);
  const [habitType, setHabitType] = useState("boolean");

  useEffect(() => {
    if (editHabit) {
      setName(editHabit.name);
      setIcon(editHabit.icon);
      setColor(editHabit.color);
      setFrequency(editHabit.frequency);
      setFrequencyTarget(editHabit.frequency_target);
      setHabitType(editHabit.habit_type);
    } else {
      setName("");
      setIcon(HABIT_ICONS[0]);
      setColor(HABIT_COLORS[0]);
      setFrequency("daily");
      setFrequencyTarget(1);
      setHabitType("boolean");
    }
  }, [editHabit, open]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      icon,
      color,
      frequency,
      frequency_target: frequency === "daily" ? 1 : frequencyTarget,
      habit_type: habitType,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1 hover:bg-surface-3 transition-colors"
        >
          <X className="h-5 w-5 text-text-secondary" />
        </button>

        <h2 className="text-lg font-bold text-text mb-5">
          {editHabit ? "Edit Habit" : "Create Habit"}
        </h2>

        {/* Name */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-text">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            placeholder="Habit name"
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary"
          />
        </div>

        {/* Type Toggle */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-text">Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setHabitType("boolean")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                habitType === "boolean" ? "bg-primary text-white" : "bg-surface-3 text-text-secondary"
              }`}
            >
              ✓ Checklist
            </button>
            <button
              onClick={() => setHabitType("descriptive")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                habitType === "descriptive" ? "bg-primary text-white" : "bg-surface-3 text-text-secondary"
              }`}
            >
              📝 Journal
            </button>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {habitType === "boolean" ? "Simple yes/no tracking" : "Log text, voice, or photos"}
          </p>
        </div>

        {/* Icon Selector */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-text">Icon</label>
          <div className="flex gap-2 flex-wrap">
            {HABIT_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  icon === ic ? "bg-primary-light ring-2 ring-primary" : "bg-surface-3 hover:bg-surface-3"
                }`}
              >
                <HabitIcon icon={ic} size={20} color={icon === ic ? color : "#757575"} />
              </button>
            ))}
          </div>
        </div>

        {/* Color Selector */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-text">Color</label>
          <div className="flex gap-2 flex-wrap">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition-all ${
                  color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-text">Frequency</label>
          <div className="flex gap-2">
            {["daily", "weekly", "monthly"].map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  frequency === f ? "bg-primary text-white" : "bg-surface-3 text-text-secondary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Target (for weekly/monthly) */}
        {frequency !== "daily" && (
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-semibold text-text">
              Times per {frequency === "weekly" ? "week" : "month"}
            </label>
            <input
              type="number"
              min={1}
              max={frequency === "weekly" ? 7 : 30}
              value={frequencyTarget}
              onChange={(e) => setFrequencyTarget(Number(e.target.value) || 1)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-sm font-semibold text-text hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {editHabit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
