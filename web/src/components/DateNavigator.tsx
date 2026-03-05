import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onReset?: () => void;
}

export default function DateNavigator({
  label,
  onPrev,
  onNext,
  onReset,
}: DateNavigatorProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrev}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-sm hover:bg-gray-50 transition-colors"
      >
        <ChevronLeft className="h-5 w-5 text-primary" />
      </button>
      <button
        onClick={onReset}
        disabled={!onReset}
        className={`text-sm font-semibold text-text ${onReset ? "hover:text-primary cursor-pointer" : ""}`}
      >
        {label}
      </button>
      <button
        onClick={onNext}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-sm hover:bg-gray-50 transition-colors"
      >
        <ChevronRight className="h-5 w-5 text-primary" />
      </button>
    </div>
  );
}
