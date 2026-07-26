"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";

export type ToastTone = "success" | "warning" | "danger" | "info";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (title: string, description?: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, description?: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setItems((current) => [...current, { id, title, description, tone }]);
      window.setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite">
        {items.map((item) => {
          const Icon = item.tone === "success" ? Check : item.tone === "warning" ? TriangleAlert : item.tone === "danger" ? X : Info;
          return (
            <div className="toast" data-tone={item.tone} key={item.id}>
              <span className="toast__icon"><Icon size={17} /></span>
              <div>
                <strong>{item.title}</strong>
                {item.description ? <p>{item.description}</p> : null}
              </div>
              <button aria-label="Dismiss notification" onClick={() => remove(item.id)}><X size={15} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}
