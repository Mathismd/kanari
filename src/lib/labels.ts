import type { Category, EstablishmentType, Role, ServiceType } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  collectivite: "Collectivité",
  responsable: "Responsable de cantine",
  personnel: "Personnel de restauration",
  association: "Association partenaire",
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  petit_dejeuner: "Petit-déjeuner",
  dejeuner: "Déjeuner",
  gouter: "Goûter",
  diner: "Dîner",
};

export const ESTABLISHMENT_TYPE_LABELS: Record<EstablishmentType, string> = {
  ecole: "École",
  college: "Collège",
  lycee: "Lycée",
  cuisine_centrale: "Cuisine centrale",
  autre: "Autre",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  entree: "Entrées",
  plat_proteine: "Viandes, poissons, œufs",
  accompagnement: "Féculents et accompagnements",
  legumes: "Légumes",
  produit_laitier: "Produits laitiers",
  fruit: "Fruits",
  dessert: "Desserts",
  pain: "Pain",
  autre: "Autres",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const kgFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const eurFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export const fmtKg = (v: number) => `${kgFmt.format(v)} kg`;
export const fmtInt = (v: number) => intFmt.format(v);
export const fmtEur = (v: number) => eurFmt.format(v);
export const fmtPct = (v: number) => `${pctFmt.format(v)} %`;
export const fmtG = (v: number) => `${intFmt.format(v)} g`;

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}
