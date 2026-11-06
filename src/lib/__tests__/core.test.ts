import { describe, expect, it } from "vitest";
import { addDays, schoolDays, weekStart } from "../dates";
import { byWeekday, completeness, pilotResult, summarize } from "../metrics";
import { recommend } from "../recommendations";
import { createDemoStore } from "../store/demo";
import { DEMO_IDS, buildDemoState } from "../store/seed";
import type { Pilot, WasteRecord } from "../types";
import { parseNumber, wasteRecordSchema } from "../validation";

const TODAY = "2026-11-05"; // jeudi
const cost = () => 5;

const rec = (over: Partial<WasteRecord>): WasteRecord => ({
  id: Math.random().toString(36),
  establishmentId: "e1",
  serviceDate: "2026-11-02",
  service: "dejeuner",
  mealsPlanned: 200,
  mealsServed: 200,
  plateWasteKg: 10,
  kitchenSurplusKg: 10,
  producedKg: null,
  menu: null,
  details: [],
  comment: null,
  createdBy: null,
  createdAt: "2026-11-02T12:00:00Z",
  ...over,
});

describe("dates", () => {
  it("calcule le lundi de la semaine", () => {
    expect(weekStart("2026-11-05")).toBe("2026-11-02");
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // dimanche
  });
  it("liste les jours d'école", () => {
    expect(schoolDays("2026-11-02", "2026-11-08")).toHaveLength(5);
  });
});

describe("indicateurs", () => {
  it("calcule les grammes par repas, le taux et le coût", () => {
    const s = summarize([rec({ producedKg: 80 }), rec({ serviceDate: "2026-11-03" })], cost);
    expect(s.wasteKg).toBe(40);
    expect(s.gPerMeal).toBe(100); // 40 kg / 400 repas
    expect(s.wasteRate).toBe(25); // taux calculé seulement là où la production est pesée : 20 / 80
    expect(s.cost).toBe(200);
  });
  it("renvoie null sans repas servis", () => {
    expect(summarize([], cost).gPerMeal).toBeNull();
  });
  it("mesure la régularité des pesées", () => {
    const records = [rec({ serviceDate: "2026-11-02" }), rec({ serviceDate: "2026-11-03" })];
    expect(completeness(records, ["e1"], "2026-11-02", "2026-11-06")).toBe(40);
  });
  it("repère le jour de la semaine", () => {
    const d = byWeekday([rec({ serviceDate: "2026-11-06", plateWasteKg: 30 })]);
    expect(d.find((x) => x.dow === 5)?.gPerMeal).toBe(200);
  });
});

describe("pilote", () => {
  const pilot: Pilot = {
    id: "p", establishmentId: "e1", name: "Test",
    baselineStart: "2026-09-01", baselineEnd: "2026-09-30",
    followupStart: "2026-10-01", followupEnd: "2026-10-31",
    targetReductionPct: 15, actions: null,
  };
  const days = (from: string, to: string, kg: number) =>
    schoolDays(from, to).map((d) => rec({ serviceDate: d, plateWasteKg: kg, kitchenSurplusKg: 0 }));

  it("mesure la baisse en g/repas et les kilos évités", () => {
    const r = pilotResult([...days("2026-09-01", "2026-09-30", 20), ...days("2026-10-01", "2026-10-31", 15)], pilot, 5);
    expect(r.reductionPct).toBeCloseTo(25);
    expect(r.targetReached).toBe(true);
    expect(r.reliable).toBe(true);
    expect(r.avoidedKg).toBeCloseTo(5 * 22); // 5 kg évités x 22 jours de suivi
  });
  it("refuse de conclure avec trop peu de pesées", () => {
    const r = pilotResult([rec({ serviceDate: "2026-09-02" }), rec({ serviceDate: "2026-10-02" })], pilot, 5);
    expect(r.reliable).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("validation de la saisie", () => {
  const schema = wasteRecordSchema(TODAY);
  const base = {
    establishmentId: "e1", serviceDate: TODAY, service: "dejeuner" as const, mealsPlanned: 200, mealsServed: 190,
    plateWasteKg: 10, kitchenSurplusKg: 5, producedKg: 80, menu: "", comment: "", details: [],
  };
  it("accepte une saisie cohérente", () => {
    expect(schema.safeParse(base).success).toBe(true);
  });
  it("refuse un total jeté supérieur à la production", () => {
    expect(schema.safeParse({ ...base, producedKg: 10 }).success).toBe(false);
  });
  it("refuse une date future", () => {
    expect(schema.safeParse({ ...base, serviceDate: addDays(TODAY, 1) }).success).toBe(false);
  });
  it("refuse un détail supérieur au total", () => {
    expect(schema.safeParse({ ...base, details: [{ category: "legumes", kg: 20 }] }).success).toBe(false);
  });
  it("détecte une saisie en grammes au lieu de kilos", () => {
    expect(schema.safeParse({ ...base, plateWasteKg: 2000, producedKg: null }).success).toBe(false);
  });
  it("lit les nombres au format français", () => {
    expect(parseNumber("12,5")).toBe(12.5);
    expect(parseNumber("")).toBeNull();
    expect(Number.isNaN(parseNumber("abc"))).toBe(true);
  });
});

describe("données de démonstration et recommandations", () => {
  const state = buildDemoState(TODAY);
  const costOf = (id: string) => state.establishments.find((e) => e.id === id)?.costPerKg ?? 5;

  it("génère des pesées toutes valides", () => {
    const schema = wasteRecordSchema(TODAY);
    for (const r of state.records) {
      const res = schema.safeParse({ ...r, menu: r.menu ?? "", comment: r.comment ?? "" });
      expect(res.success, JSON.stringify(res.error?.issues)).toBe(true);
    }
  });
  it("le pilote de démonstration montre une baisse fiable", () => {
    const est = state.establishments[0];
    const r = pilotResult(state.records, state.pilots[0], est.costPerKg);
    expect(r.reliable).toBe(true);
    expect(r.reductionPct!).toBeGreaterThan(10);
  });
  it("produit des recommandations argumentées", () => {
    const recos = recommend(state.records, state.establishments, TODAY, costOf);
    expect(recos.length).toBeGreaterThan(1);
    expect(recos.some((r) => r.id === "weekday")).toBe(true);
  });
  it("invite à commencer sans données", () => {
    expect(recommend([], state.establishments, TODAY, costOf)[0].id).toBe("start");
  });
});

describe("droits d'accès en mode démo", () => {
  it("le personnel ne voit et ne saisit que pour son établissement", async () => {
    const store = createDemoStore();
    await store.signInAs(DEMO_IDS.staff);
    const records = await store.listRecords();
    expect(new Set(records.map((r) => r.establishmentId))).toEqual(new Set([DEMO_IDS.est1]));
    await expect(store.saveRecord({
      establishmentId: DEMO_IDS.est3, serviceDate: "2026-11-05", service: "dejeuner", mealsPlanned: 10, mealsServed: 10,
      plateWasteKg: 1, kitchenSurplusKg: 0, producedKg: null, menu: null, details: [], comment: null,
    })).rejects.toThrow();
    const anyRecord = records[0];
    await expect(store.deleteRecord(anyRecord.id)).rejects.toThrow();
    await expect(store.updateProfile(DEMO_IDS.staff, { role: "admin" })).rejects.toThrow();
  });
  it("la collectivité ne voit que ses établissements et ne saisit rien", async () => {
    const store = createDemoStore();
    await store.signInAs(DEMO_IDS.coll);
    const ests = await store.listEstablishments();
    expect(ests.map((e) => e.id).sort()).toEqual([DEMO_IDS.est1, DEMO_IDS.est2]);
  });
  it("refuse un doublon de service", async () => {
    const store = createDemoStore();
    await store.signInAs(DEMO_IDS.resp);
    const existing = (await store.listRecords())[0];
    await expect(store.saveRecord({ ...existing, comment: null })).rejects.toThrow(/existe déjà/);
  });
});
