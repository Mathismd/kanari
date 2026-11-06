import { z } from "zod";
import { CATEGORIES } from "./labels";
import type { Category } from "./types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const kg = (label: string) =>
  z.number({ error: `${label} : nombre attendu` }).min(0, `${label} : valeur négative`).max(5000, `${label} : valeur trop élevée`);
const optionalText = (max: number) =>
  z.string().trim().max(max, `${max} caractères maximum`).transform((v) => (v === "" ? null : v)).nullable();

export function wasteRecordSchema(today: string) {
  return z
    .object({
      establishmentId: z.string().min(1, "Choisissez un établissement"),
      serviceDate: isoDate.refine((d) => d <= today, "La date ne peut pas être dans le futur").refine((d) => d >= "2020-01-01", "Date trop ancienne"),
      service: z.enum(["petit_dejeuner", "dejeuner", "gouter", "diner"]),
      mealsPlanned: z.number().int("Nombre entier attendu").min(0).max(20000),
      mealsServed: z.number().int("Nombre entier attendu").min(0).max(20000),
      plateWasteKg: kg("Restes des assiettes"),
      kitchenSurplusKg: kg("Excédents de cuisine"),
      producedKg: z.number().positive("La production doit être positive").max(20000).nullable(),
      menu: optionalText(200),
      comment: optionalText(500),
      details: z
        .array(z.object({ category: z.enum(CATEGORIES as [Category, ...Category[]]), kg: kg("Détail") }))
        .max(20),
    })
    .superRefine((v, ctx) => {
      const waste = v.plateWasteKg + v.kitchenSurplusKg;
      if (v.producedKg !== null && waste > v.producedKg) {
        ctx.addIssue({ code: "custom", path: ["producedKg"], message: "Le total jeté dépasse la quantité produite" });
      }
      const detail = v.details.reduce((a, d) => a + d.kg, 0);
      if (detail > waste + 0.01) {
        ctx.addIssue({ code: "custom", path: ["details"], message: "Le détail par catégorie dépasse le total jeté" });
      }
      if (v.mealsServed > v.mealsPlanned * 1.5 && v.mealsPlanned > 0) {
        ctx.addIssue({ code: "custom", path: ["mealsServed"], message: "Repas servis très supérieurs aux prévus : vérifiez la saisie" });
      }
      if (v.mealsServed > 0 && (waste * 1000) / v.mealsServed > 1000) {
        ctx.addIssue({ code: "custom", path: ["plateWasteKg"], message: "Plus d'1 kg jeté par repas : vérifiez l'unité (kg, pas g)" });
      }
    });
}

export const establishmentSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(150),
  type: z.enum(["ecole", "college", "lycee", "cuisine_centrale", "autre"]),
  address: optionalText(250),
  commune: z.string().trim().min(2, "Commune requise").max(80),
  managerName: optionalText(120),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Adresse électronique invalide"),
  dailyMeals: z.number().int().min(0).max(20000).nullable(),
  costPerKg: z.number().min(0).max(100),
  targetGPerMeal: z.number().int().min(0).max(1000).nullable(),
  collectivityId: z.string().nullable(),
  active: z.boolean(),
});

export const pilotSchema = z
  .object({
    establishmentId: z.string().min(1, "Choisissez un établissement"),
    name: z.string().trim().min(2, "Nom trop court").max(120),
    baselineStart: isoDate,
    baselineEnd: isoDate,
    followupStart: isoDate.nullable(),
    followupEnd: isoDate.nullable(),
    targetReductionPct: z.number().min(0).max(100),
    actions: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (v.baselineEnd < v.baselineStart) ctx.addIssue({ code: "custom", path: ["baselineEnd"], message: "La fin précède le début" });
    if (v.followupStart && v.followupStart <= v.baselineEnd)
      ctx.addIssue({ code: "custom", path: ["followupStart"], message: "Le suivi doit commencer après la référence" });
    if (v.followupEnd && (!v.followupStart || v.followupEnd < v.followupStart))
      ctx.addIssue({ code: "custom", path: ["followupEnd"], message: "La fin du suivi précède son début" });
  });

/** Lit un nombre saisi au format français (virgule acceptée). */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
