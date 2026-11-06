// Dates manipulées en chaînes AAAA-MM-JJ, calculées en UTC pour éviter les décalages de fuseau.

export function todayIso(now: Date = new Date()): string {
  // Date locale de l'utilisateur (Martinique en pratique), pas la date UTC.
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

/** 0 = dimanche … 6 = samedi */
export function dayOfWeek(iso: string): number {
  return toDate(iso).getUTCDay();
}

export function weekStart(iso: string): string {
  const dow = dayOfWeek(iso);
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
}

/** Jours ouvrés (lundi–vendredi) de l'intervalle inclusif. */
export function schoolDays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const dow = dayOfWeek(d);
    if (dow >= 1 && dow <= 5) out.push(d);
  }
  return out;
}
