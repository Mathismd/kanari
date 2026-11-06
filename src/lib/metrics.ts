import { addDays, dayOfWeek, monthKey, schoolDays, weekStart } from "./dates";
import type { Category, Pilot, WasteRecord } from "./types";

export type CostLookup = (establishmentId: string) => number;

export const wasteOf = (r: WasteRecord) => r.plateWasteKg + r.kitchenSurplusKg;

export interface Summary {
  services: number;
  mealsPlanned: number;
  mealsServed: number;
  plateKg: number;
  surplusKg: number;
  wasteKg: number;
  /** Grammes jetés par repas servi : l'indicateur principal, comparable d'un jour à l'autre. */
  gPerMeal: number | null;
  /** Part jetée de la production, uniquement sur les services où la production a été pesée. */
  wasteRate: number | null;
  producedKg: number;
  cost: number;
  /** Écart entre repas prévus et servis, en % des repas prévus. */
  forecastGap: number | null;
}

export function summarize(records: WasteRecord[], costOf: CostLookup): Summary {
  let mealsPlanned = 0, mealsServed = 0, plateKg = 0, surplusKg = 0, cost = 0;
  let producedKg = 0, wasteWithProduction = 0;
  for (const r of records) {
    mealsPlanned += r.mealsPlanned;
    mealsServed += r.mealsServed;
    plateKg += r.plateWasteKg;
    surplusKg += r.kitchenSurplusKg;
    cost += wasteOf(r) * costOf(r.establishmentId);
    if (r.producedKg) {
      producedKg += r.producedKg;
      wasteWithProduction += wasteOf(r);
    }
  }
  const wasteKg = plateKg + surplusKg;
  return {
    services: records.length,
    mealsPlanned,
    mealsServed,
    plateKg,
    surplusKg,
    wasteKg,
    gPerMeal: mealsServed > 0 ? (wasteKg * 1000) / mealsServed : null,
    wasteRate: producedKg > 0 ? (wasteWithProduction / producedKg) * 100 : null,
    producedKg,
    cost,
    forecastGap: mealsPlanned > 0 ? ((mealsPlanned - mealsServed) / mealsPlanned) * 100 : null,
  };
}

export const inRange = (records: WasteRecord[], from: string, to: string) =>
  records.filter((r) => r.serviceDate >= from && r.serviceDate <= to);

/** Variation en % (null si la base est vide). */
export function change(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface SeriesPoint {
  key: string;
  wasteKg: number;
  plateKg: number;
  surplusKg: number;
  mealsServed: number;
  gPerMeal: number | null;
  cost: number;
}

function group(records: WasteRecord[], keyOf: (r: WasteRecord) => string, costOf: CostLookup): Map<string, SeriesPoint> {
  const map = new Map<string, SeriesPoint>();
  for (const r of records) {
    const k = keyOf(r);
    const p = map.get(k) ?? { key: k, wasteKg: 0, plateKg: 0, surplusKg: 0, mealsServed: 0, gPerMeal: null, cost: 0 };
    p.plateKg += r.plateWasteKg;
    p.surplusKg += r.kitchenSurplusKg;
    p.wasteKg += wasteOf(r);
    p.mealsServed += r.mealsServed;
    p.cost += wasteOf(r) * costOf(r.establishmentId);
    map.set(k, p);
  }
  for (const p of map.values()) p.gPerMeal = p.mealsServed > 0 ? (p.wasteKg * 1000) / p.mealsServed : null;
  return map;
}

export type Granularity = "jour" | "semaine" | "mois";

export function series(records: WasteRecord[], granularity: Granularity, costOf: CostLookup): SeriesPoint[] {
  const keyOf =
    granularity === "jour" ? (r: WasteRecord) => r.serviceDate
    : granularity === "semaine" ? (r: WasteRecord) => weekStart(r.serviceDate)
    : (r: WasteRecord) => monthKey(r.serviceDate);
  return [...group(records, keyOf, costOf).values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Série quotidienne continue sur les jours ouvrés (jours sans pesée = valeurs nulles). */
export function dailySeries(records: WasteRecord[], from: string, to: string, costOf: CostLookup) {
  const map = group(inRange(records, from, to), (r) => r.serviceDate, costOf);
  return schoolDays(from, to).map(
    (d) => map.get(d) ?? { key: d, wasteKg: 0, plateKg: 0, surplusKg: 0, mealsServed: 0, gPerMeal: null, cost: 0 },
  );
}

export function byCategory(records: WasteRecord[]): { category: Category; kg: number; share: number }[] {
  const totals = new Map<Category, number>();
  for (const r of records) for (const d of r.details) totals.set(d.category, (totals.get(d.category) ?? 0) + d.kg);
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([category, kg]) => ({ category, kg, share: sum > 0 ? (kg / sum) * 100 : 0 }))
    .sort((a, b) => b.kg - a.kg);
}

export function byWeekday(records: WasteRecord[]): { dow: number; gPerMeal: number | null; services: number }[] {
  const acc = new Map<number, { waste: number; meals: number; services: number }>();
  for (const r of records) {
    const dow = dayOfWeek(r.serviceDate);
    const a = acc.get(dow) ?? { waste: 0, meals: 0, services: 0 };
    a.waste += wasteOf(r);
    a.meals += r.mealsServed;
    a.services += 1;
    acc.set(dow, a);
  }
  return [1, 2, 3, 4, 5].map((dow) => {
    const a = acc.get(dow);
    return { dow, gPerMeal: a && a.meals > 0 ? (a.waste * 1000) / a.meals : null, services: a?.services ?? 0 };
  });
}

export interface MenuStat {
  menu: string;
  services: number;
  gPerMeal: number;
  wasteKg: number;
}

/** Menus classés par grammes jetés par repas (le volume brut favoriserait les gros jours). */
export function menuRanking(records: WasteRecord[]): MenuStat[] {
  const acc = new Map<string, { label: string; waste: number; meals: number; services: number }>();
  for (const r of records) {
    const label = r.menu?.trim();
    if (!label || r.mealsServed === 0) continue;
    const key = label.toLocaleLowerCase("fr-FR");
    const a = acc.get(key) ?? { label, waste: 0, meals: 0, services: 0 };
    a.waste += wasteOf(r);
    a.meals += r.mealsServed;
    a.services += 1;
    acc.set(key, a);
  }
  return [...acc.values()]
    .map((a) => ({ menu: a.label, services: a.services, gPerMeal: (a.waste * 1000) / a.meals, wasteKg: a.waste }))
    .sort((a, b) => b.gPerMeal - a.gPerMeal);
}

/** Part des jours ouvrés de la période qui ont au moins une pesée. */
export function completeness(records: WasteRecord[], establishmentIds: string[], from: string, to: string): number | null {
  const days = schoolDays(from, to);
  if (days.length === 0 || establishmentIds.length === 0) return null;
  const seen = new Set(inRange(records, from, to).map((r) => `${r.establishmentId}|${r.serviceDate}`));
  let hit = 0;
  for (const e of establishmentIds) for (const d of days) if (seen.has(`${e}|${d}`)) hit++;
  return (hit / (days.length * establishmentIds.length)) * 100;
}

export interface PilotResult {
  baseline: Summary;
  followup: Summary | null;
  /** Baisse en % du nombre de grammes jetés par repas (positif = amélioration). */
  reductionPct: number | null;
  targetReached: boolean | null;
  /** Kilos évités sur la période de suivi, à fréquentation égale. */
  avoidedKg: number | null;
  avoidedCost: number | null;
  baselineCompleteness: number | null;
  followupCompleteness: number | null;
  /** Le résultat n'est présenté comme fiable que si chaque période a assez de pesées. */
  reliable: boolean;
  warnings: string[];
}

export const MIN_SERVICES_PER_PERIOD = 8;
export const MIN_COMPLETENESS = 70;

export function pilotResult(records: WasteRecord[], pilot: Pilot, costPerKg: number): PilotResult {
  const own = records.filter((r) => r.establishmentId === pilot.establishmentId);
  const costOf = () => costPerKg;
  const baseRecords = inRange(own, pilot.baselineStart, pilot.baselineEnd);
  const baseline = summarize(baseRecords, costOf);
  const baselineCompleteness = completeness(own, [pilot.establishmentId], pilot.baselineStart, pilot.baselineEnd);
  const warnings: string[] = [];

  if (baseline.services < MIN_SERVICES_PER_PERIOD) {
    warnings.push(`La période de référence ne compte que ${baseline.services} pesée(s) : il en faut au moins ${MIN_SERVICES_PER_PERIOD}.`);
  }
  if (baselineCompleteness !== null && baselineCompleteness < MIN_COMPLETENESS) {
    warnings.push("Des jours manquent dans la période de référence : la comparaison risque d'être biaisée.");
  }

  if (!pilot.followupStart) {
    return { baseline, followup: null, reductionPct: null, targetReached: null, avoidedKg: null, avoidedCost: null,
      baselineCompleteness, followupCompleteness: null, reliable: false, warnings };
  }

  const followEnd = pilot.followupEnd ?? addDays(pilot.followupStart, 365);
  const followRecords = inRange(own, pilot.followupStart, followEnd);
  const followup = summarize(followRecords, costOf);
  const lastDay = followRecords.reduce((m, r) => (r.serviceDate > m ? r.serviceDate : m), pilot.followupStart);
  const followupCompleteness = completeness(own, [pilot.establishmentId], pilot.followupStart, pilot.followupEnd ?? lastDay);

  if (followup.services < MIN_SERVICES_PER_PERIOD) {
    warnings.push(`La période de suivi ne compte que ${followup.services} pesée(s) : il en faut au moins ${MIN_SERVICES_PER_PERIOD}.`);
  }
  if (followupCompleteness !== null && followupCompleteness < MIN_COMPLETENESS) {
    warnings.push("Des jours manquent dans la période de suivi.");
  }

  let reductionPct: number | null = null, avoidedKg: number | null = null;
  if (baseline.gPerMeal !== null && followup.gPerMeal !== null && baseline.gPerMeal > 0) {
    reductionPct = ((baseline.gPerMeal - followup.gPerMeal) / baseline.gPerMeal) * 100;
    avoidedKg = ((baseline.gPerMeal - followup.gPerMeal) * followup.mealsServed) / 1000;
  }

  const reliable = warnings.length === 0 && reductionPct !== null;
  return {
    baseline,
    followup,
    reductionPct,
    targetReached: reductionPct === null ? null : reductionPct >= pilot.targetReductionPct,
    avoidedKg,
    avoidedCost: avoidedKg === null ? null : avoidedKg * costPerKg,
    baselineCompleteness,
    followupCompleteness,
    reliable,
    warnings,
  };
}
