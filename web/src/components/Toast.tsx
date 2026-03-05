"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  exiting: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const BG_COLORS = {
  success: "bg-green-50 border-primary",
  error: "bg-red-50 border-error",
  info: "bg-blue-50 border-blue-500",
};

const TEXT_COLORS = {
  success: "text-primary-dark",
  error: "text-error",
  info: "text-blue-700",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, type, message, exiting: false }]);
      setTimeout(() => dismiss(id), 2500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg min-w-[280px] max-w-[420px] ${
                BG_COLORS[toast.type]
              } ${toast.exiting ? "toast-exit" : "toast-enter"}`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${TEXT_COLORS[toast.type]}`} />
              <span className={`text-sm font-medium flex-1 ${TEXT_COLORS[toast.type]}`}>
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-black/5"
              >
                <X className="h-3.5 w-3.5 text-text-secondary" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
