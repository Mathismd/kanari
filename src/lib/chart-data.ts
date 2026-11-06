import { fmtDate } from "./labels";
import type { ChartPoint } from "@/components/charts";
import type { Granularity, SeriesPoint } from "./metrics";

const round1 = (v: number) => Math.round(v * 10) / 10;

export function toChart(points: SeriesPoint[], granularity: Granularity): ChartPoint[] {
  return points.map((p) => ({
    label:
      granularity === "mois"
        ? new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${p.key}-01T00:00:00Z`))
        : granularity === "semaine"
          ? `sem. ${fmtDate(p.key)}`
          : fmtDate(p.key, { weekday: "short", day: "numeric" }),
    plateKg: round1(p.plateKg),
    surplusKg: round1(p.surplusKg),
    gPerMeal: p.gPerMeal === null ? null : Math.round(p.gPerMeal),
    cost: Math.round(p.cost),
  }));
}
