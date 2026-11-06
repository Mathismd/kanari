import { addDays, dayOfWeek, schoolDays } from "../dates";
import type { Category, Collectivity, DetailLine, Establishment, Pilot, Profile, WasteRecord } from "../types";

// Données de démonstration FICTIVES, générées de façon déterministe.
// Elles servent à présenter l'outil, pas à décrire la situation réelle d'un établissement.

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v: number, step = 0.1) => Math.round(v / step) * step;

interface Menu {
  label: string;
  factor: number; // multiplicateur de gaspillage
  mix: Partial<Record<Category, number>>; // répartition des restes
}

const MENUS: Menu[] = [
  { label: "Colombo de poulet, riz", factor: 0.8, mix: { plat_proteine: 0.3, accompagnement: 0.45, legumes: 0.15, dessert: 0.1 } },
  { label: "Poisson grillé, purée de fruit à pain", factor: 1.05, mix: { plat_proteine: 0.35, accompagnement: 0.35, legumes: 0.15, fruit: 0.15 } },
  { label: "Gratin de christophines, steak haché", factor: 1.45, mix: { legumes: 0.55, plat_proteine: 0.2, pain: 0.1, dessert: 0.15 } },
  { label: "Pois rouges, riz, poulet", factor: 0.85, mix: { accompagnement: 0.5, plat_proteine: 0.3, fruit: 0.2 } },
  { label: "Court-bouillon de poisson, ignames", factor: 1.3, mix: { plat_proteine: 0.35, accompagnement: 0.4, legumes: 0.15, pain: 0.1 } },
  { label: "Pâtes à la bolognaise", factor: 0.7, mix: { accompagnement: 0.55, plat_proteine: 0.25, produit_laitier: 0.2 } },
  { label: "Haricots verts, cuisse de dinde", factor: 1.35, mix: { legumes: 0.5, plat_proteine: 0.3, dessert: 0.2 } },
  { label: "Lentilles, riz, salade de carottes", factor: 1.0, mix: { accompagnement: 0.45, entree: 0.3, fruit: 0.25 } },
];

export const DEMO_IDS = {
  coll1: "c-demo-1",
  coll2: "c-demo-2",
  est1: "e-demo-1",
  est2: "e-demo-2",
  est3: "e-demo-3",
  admin: "u-demo-admin",
  coll: "u-demo-coll",
  resp: "u-demo-resp",
  staff: "u-demo-staff",
};

export interface DemoState {
  version: number;
  collectivities: Collectivity[];
  establishments: Establishment[];
  profiles: Profile[];
  records: WasteRecord[];
  pilots: Pilot[];
  sessionUserId: string | null;
}

export const DEMO_VERSION = 1;

export function buildDemoState(today: string): DemoState {
  const r = rng(972);
  const collectivities: Collectivity[] = [
    { id: DEMO_IDS.coll1, name: "Commune de Saint-Pierre (démo)" },
    { id: DEMO_IDS.coll2, name: "Collectivité territoriale (démo)" },
  ];

  const establishments: Establishment[] = [
    { id: DEMO_IDS.est1, name: "École du Bourg", type: "ecole", address: "Adresse fictive", commune: "Saint-Pierre",
      managerName: "Mme Responsable (démo)", contactEmail: "cantine.bourg@exemple.fr", dailyMeals: 220,
      costPerKg: 5, targetGPerMeal: 90, collectivityId: DEMO_IDS.coll1, active: true },
    { id: DEMO_IDS.est2, name: "École du Fort", type: "ecole", address: "Adresse fictive", commune: "Saint-Pierre",
      managerName: "M. Responsable (démo)", contactEmail: "cantine.fort@exemple.fr", dailyMeals: 160,
      costPerKg: 5, targetGPerMeal: 90, collectivityId: DEMO_IDS.coll1, active: true },
    { id: DEMO_IDS.est3, name: "Collège Rivière", type: "college", address: "Adresse fictive", commune: "Le Carbet",
      managerName: "Mme Gestionnaire (démo)", contactEmail: "restauration.riviere@exemple.fr", dailyMeals: 410,
      costPerKg: 5.5, targetGPerMeal: 110, collectivityId: DEMO_IDS.coll2, active: true },
  ];

  const profiles: Profile[] = [
    { id: DEMO_IDS.admin, email: "admin@demo.kanari", fullName: "Équipe Kanari", role: "admin", establishmentId: null, collectivityId: null, active: true },
    { id: DEMO_IDS.coll, email: "restauration@demo.kanari", fullName: "Service restauration de la commune", role: "collectivite", establishmentId: null, collectivityId: DEMO_IDS.coll1, active: true },
    { id: DEMO_IDS.resp, email: "responsable@demo.kanari", fullName: "Responsable de l'École du Bourg", role: "responsable", establishmentId: DEMO_IDS.est1, collectivityId: null, active: true },
    { id: DEMO_IDS.staff, email: "cuisine@demo.kanari", fullName: "Agent de restauration", role: "personnel", establishmentId: DEMO_IDS.est1, collectivityId: null, active: true },
  ];

  // 13 semaines d'historique ; pilote à l'École du Bourg : référence puis actions à partir de J-35.
  const start = addDays(today, -91);
  const actionStart = addDays(today, -35);
  const days = schoolDays(start, addDays(today, -1));
  const base: Record<string, number> = { [DEMO_IDS.est1]: 118, [DEMO_IDS.est2]: 104, [DEMO_IDS.est3]: 132 };
  const records: WasteRecord[] = [];
  let n = 0;

  for (const est of establishments) {
    days.forEach((day, i) => {
      if (r() < 0.06) return; // jour sans pesée
      const menu = MENUS[(i + (est.id === DEMO_IDS.est3 ? 3 : 0)) % MENUS.length];
      const planned = Math.round((est.dailyMeals ?? 200) * (0.97 + r() * 0.06));
      const absent = dayOfWeek(day) === 5 ? 0.12 : 0.05; // plus d'absences le vendredi
      const served = Math.round(planned * (1 - absent - r() * 0.04));
      let g = base[est.id] * menu.factor * (0.85 + r() * 0.3);
      if (dayOfWeek(day) === 5) g *= 1.3;
      if (est.id === DEMO_IDS.est1 && day >= actionStart) g *= 0.78; // effet des actions du pilote
      const waste = (g * served) / 1000;
      const surplusShare = 0.32 + r() * 0.12 + (planned - served) / planned;
      const kitchen = round(waste * Math.min(surplusShare, 0.6));
      const plate = round(waste - kitchen);
      const produced = r() < 0.7 ? round((served * (0.33 + r() * 0.04)) + waste, 0.5) : null;
      let details: DetailLine[] = [];
      if (r() < 0.65) {
        const total = plate + kitchen;
        details = Object.entries(menu.mix).map(([category, share]) => ({
          category: category as Category,
          kg: Math.floor(total * (share ?? 0) * 10) / 10,
        }));
      }
      records.push({
        id: `w-demo-${n++}`,
        establishmentId: est.id,
        serviceDate: day,
        service: "dejeuner",
        mealsPlanned: planned,
        mealsServed: served,
        plateWasteKg: plate,
        kitchenSurplusKg: kitchen,
        producedKg: produced,
        menu: menu.label,
        details,
        comment: null,
        createdBy: est.id === DEMO_IDS.est1 ? DEMO_IDS.staff : null,
        createdAt: `${day}T13:30:00.000Z`,
      });
    });
  }

  const pilots: Pilot[] = [
    {
      id: "p-demo-1",
      establishmentId: DEMO_IDS.est1,
      name: "Portions ajustées et pain à la demande",
      baselineStart: addDays(today, -91),
      baselineEnd: addDays(today, -40),
      followupStart: actionStart,
      followupEnd: null,
      targetReductionPct: 15,
      actions: "Commande calée sur les effectifs confirmés la veille. Pain servi à la demande. Petites portions de légumes avec possibilité de se resservir.",
    },
  ];

  return { version: DEMO_VERSION, collectivities, establishments, profiles, records, pilots, sessionUserId: null };
}
