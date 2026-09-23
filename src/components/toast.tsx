"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<{ addToast: (message: string, kind?: ToastKind) => void } | null>(
  null
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 end-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDone }: { toast: ToastItem; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const autoTimer = setTimeout(() => setLeaving(true), 4000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(autoTimer);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(onDone, 200);
    return () => clearTimeout(timer);
  }, [leaving, onDone]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg transition-all duration-200 ease-out",
        toast.kind === "success" ? "border-success/30 bg-surface text-foreground" : "border-danger/30 bg-surface text-foreground",
        visible && !leaving ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      {toast.kind === "success" ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />
      )}
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => setLeaving(true)} className="text-muted hover:text-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
