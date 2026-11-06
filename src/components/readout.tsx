import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * L'afficheur de balance : l'élément signature de Kanari.
 * Un seul chiffre, très lisible, qui ramène tout au même repère : les grammes jetés par repas servi.
 */
export function Readout({
  value,
  unit = "g",
  caption,
  footer,
  className,
  size = "lg",
}: {
  value: string;
  unit?: string;
  caption: string;
  footer?: ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className={clsx("rounded-2xl bg-forest-dark p-6 text-white", className)}>
      <p className="text-sm font-medium text-white/70">{caption}</p>
      <p className="figure mt-2 flex items-baseline gap-2 font-bold leading-none" aria-live="polite">
        <span className={size === "lg" ? "text-6xl sm:text-7xl" : "text-5xl"}>{value}</span>
        <span className="text-2xl font-semibold text-leaf">{unit}</span>
      </p>
      {footer && <div className="mt-4 text-sm text-white/80">{footer}</div>}
    </div>
  );
}

export function Figure({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="py-3">
      <p className="text-[13px] font-medium text-ink-soft">{label}</p>
      <p className="figure mt-0.5 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-[13px] text-ink-soft">{sub}</p>}
    </div>
  );
}

/** Variation : une baisse du gaspillage est une bonne nouvelle, donc affichée en vert. */
export function Delta({ value, lowerIsBetter = true }: { value: number | null; lowerIsBetter?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-white/60">pas de période précédente</span>;
  const good = lowerIsBetter ? value < 0 : value > 0;
  const sign = value > 0 ? "+" : "";
  return (
    <span className={clsx("font-semibold", good ? "text-leaf" : "text-amber-300")}>
      {sign}
      {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} % vs période précédente
    </span>
  );
}
