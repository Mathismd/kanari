"use client";

import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export { clsx as cx };

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-forest text-white hover:bg-forest-dark",
        variant === "secondary" && "border border-line bg-paper text-ink hover:bg-mist",
        variant === "ghost" && "text-ink-soft hover:bg-mist hover:text-ink",
        variant === "danger" && "border border-danger/30 bg-paper text-danger hover:bg-danger-soft",
        className,
      )}
    />
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-xl border border-line bg-paper", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

const control =
  "block w-full min-h-11 rounded-lg border border-line bg-paper px-3 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-forest focus:outline-none focus:ring-2 focus:ring-leaf/40 aria-[invalid=true]:border-danger";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(control, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(control, "pr-8", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(control, "py-2.5", props.className)} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad"; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        tone === "neutral" && "bg-mist text-ink-soft",
        tone === "good" && "bg-leaf-soft text-forest-dark",
        tone === "warn" && "bg-signal-soft text-signal",
        tone === "bad" && "bg-danger-soft text-danger",
      )}
    >
      {children}
    </span>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warn" | "good"; title?: string; children: ReactNode }) {
  const Icon = tone === "warn" ? AlertTriangle : tone === "good" ? CheckCircle2 : Info;
  return (
    <div
      className={clsx(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed",
        tone === "info" && "border-line bg-paper text-ink-soft",
        tone === "warn" && "border-signal/25 bg-signal-soft/60 text-ink",
        tone === "good" && "border-forest/20 bg-leaf-soft/60 text-ink",
      )}
    >
      <Icon aria-hidden className={clsx("mt-0.5 size-4 shrink-0", tone === "warn" ? "text-signal" : "text-forest")} />
      <div>
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-paper px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Notifications ---------- */
type Toast = { id: number; message: string; tone: "good" | "bad" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "good") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto flex max-w-md items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg",
              t.tone === "good" ? "bg-forest-dark" : "bg-danger",
            )}
          >
            {t.tone === "good" ? <CheckCircle2 className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
            <span>{t.message}</span>
            <button className="ml-1 opacity-80 hover:opacity-100" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Fermer">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Une erreur est survenue";
}
