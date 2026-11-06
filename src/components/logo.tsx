import clsx from "clsx";

/** Le kanari : la marmite en terre des cuisines antillaises. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={clsx("size-8", className)}>
      <rect width="32" height="32" rx="8" fill="#166534" />
      <path d="M9 11.5h14" stroke="#dcfce7" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10 13.5c-1.6 1.4-2.5 3.4-2.5 5.6 0 4 3.8 6.4 8.5 6.4s8.5-2.4 8.5-6.4c0-2.2-.9-4.2-2.5-5.6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M13 8.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={clsx("text-xl font-bold tracking-tight", light ? "text-white" : "text-ink")}>Kanari</span>
    </span>
  );
}
