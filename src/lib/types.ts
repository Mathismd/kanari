export type Role = "admin" | "collectivite" | "responsable" | "personnel" | "association";
export type ServiceType = "petit_dejeuner" | "dejeuner" | "gouter" | "diner";
export type EstablishmentType = "ecole" | "college" | "lycee" | "cuisine_centrale" | "autre";
export type Category =
  | "entree"
  | "plat_proteine"
  | "accompagnement"
  | "legumes"
  | "produit_laitier"
  | "fruit"
  | "dessert"
  | "pain"
  | "autre";

export interface Collectivity {
  id: string;
  name: string;
}

export interface Establishment {
  id: string;
  name: string;
  type: EstablishmentType;
  address: string | null;
  commune: string;
  managerName: string | null;
  contactEmail: string | null;
  dailyMeals: number | null;
  costPerKg: number;
  targetGPerMeal: number | null;
  collectivityId: string | null;
  active: boolean;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  establishmentId: string | null;
  collectivityId: string | null;
  active: boolean;
}

export interface DetailLine {
  category: Category;
  kg: number;
}

export interface WasteRecord {
  id: string;
  establishmentId: string;
  serviceDate: string; // AAAA-MM-JJ
  service: ServiceType;
  mealsPlanned: number;
  mealsServed: number;
  plateWasteKg: number;
  kitchenSurplusKg: number;
  producedKg: number | null;
  menu: string | null;
  details: DetailLine[];
  comment: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface Pilot {
  id: string;
  establishmentId: string;
  name: string;
  baselineStart: string;
  baselineEnd: string;
  followupStart: string | null;
  followupEnd: string | null;
  targetReductionPct: number;
  actions: string | null;
}

export type WasteRecordInput = Omit<WasteRecord, "id" | "createdBy" | "createdAt">;
export type EstablishmentInput = Omit<Establishment, "id">;
export type PilotInput = Omit<Pilot, "id">;
