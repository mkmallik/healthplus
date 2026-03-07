"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface DateNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onReset?: () => void;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

export default function DateNavigator({
  label,
  onPrev,
  onNext,
  onReset,
  onDateSelect,
  selectedDate,
}: DateNavigatorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const todayISO = new Date().toISOString().slice(0, 10);
  const selectedISO = selectedDate
    ? selectedDate.toISOString().slice(0, 10)
    : todayISO;

  const handleLabelClick = () => {
    if (onDateSelect && inputRef.current) {
      inputRef.current.showPicker();
    } else if (onReset) {
      onReset();
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onDateSelect && e.target.value) {
      const parts = e.target.value.split("-");
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      onDateSelect(d);
    }
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrev}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-sm hover:bg-gray-50 transition-colors"
      >
        <ChevronLeft className="h-5 w-5 text-primary" />
      </button>
      <div className="flex items-center gap-2 relative">
        <button
          onClick={handleLabelClick}
          className={`text-sm font-semibold text-text ${onDateSelect || onReset ? "hover:text-primary cursor-pointer" : ""}`}
        >
          {label}
        </button>
        {onDateSelect && (
          <>
            <button
              onClick={() => inputRef.current?.showPicker()}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              title="Pick a date"
            >
              <Calendar className="h-4 w-4 text-textSecondary" />
            </button>
            <input
              ref={inputRef}
              type="date"
              value={selectedISO}
              max={todayISO}
              onChange={handleDateChange}
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              tabIndex={-1}
            />
          </>
        )}
      </div>
      <button
        onClick={onNext}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-sm hover:bg-gray-50 transition-colors"
      >
        <ChevronRight className="h-5 w-5 text-primary" />
      </button>
    </div>
  );
}
