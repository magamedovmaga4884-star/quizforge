"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = (type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  return (
    <ToastContext.Provider
      value={{
        toast: addToast,
        success: (msg, title) => addToast("success", msg, title),
        error: (msg, title) => addToast("error", msg, title),
        info: (msg, title) => addToast("info", msg, title),
      }}
    >
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0",
              t.type === "success" && "bg-white border-emerald-200 text-emerald-950",
              t.type === "error" && "bg-white border-rose-200 text-rose-950",
              t.type === "warning" && "bg-white border-amber-200 text-amber-950",
              t.type === "info" && "bg-white border-blue-200 text-blue-950"
            )}
          >
            <div className="mr-3 flex-shrink-0 mt-0.5">
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {t.type === "warning" && <AlertCircle className="w-5 h-5 text-amber-600" />}
              {t.type === "info" && <Info className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1 mr-2">
              {t.title && <div className="font-semibold text-sm mb-0.5">{t.title}</div>}
              <div className="text-sm text-gray-700 leading-snug">{t.message}</div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
