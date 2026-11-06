import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Establishment, Pilot, Profile, WasteRecord } from "../types";
import { AccessError, type DataStore } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const toEstablishment = (r: Row): Establishment => ({
  id: r.id, name: r.name, type: r.type, address: r.address, commune: r.commune, managerName: r.manager_name,
  contactEmail: r.contact_email, dailyMeals: r.daily_meals, costPerKg: Number(r.cost_per_kg),
  targetGPerMeal: r.target_g_per_meal, collectivityId: r.collectivity_id, active: r.active,
});
const fromEstablishment = (e: Omit<Establishment, "id">) => ({
  name: e.name, type: e.type, address: e.address, commune: e.commune, manager_name: e.managerName,
  contact_email: e.contactEmail, daily_meals: e.dailyMeals, cost_per_kg: e.costPerKg,
  target_g_per_meal: e.targetGPerMeal, collectivity_id: e.collectivityId, active: e.active,
});

const toRecord = (r: Row): WasteRecord => ({
  id: r.id, establishmentId: r.establishment_id, serviceDate: r.service_date, service: r.service,
  mealsPlanned: r.meals_planned, mealsServed: r.meals_served, plateWasteKg: Number(r.plate_waste_kg),
  kitchenSurplusKg: Number(r.kitchen_surplus_kg), producedKg: num(r.produced_kg), menu: r.menu,
  details: Array.isArray(r.details) ? r.details : [], comment: r.comment, createdBy: r.created_by, createdAt: r.created_at,
});
const fromRecord = (r: Omit<WasteRecord, "id" | "createdBy" | "createdAt">) => ({
  establishment_id: r.establishmentId, service_date: r.serviceDate, service: r.service, meals_planned: r.mealsPlanned,
  meals_served: r.mealsServed, plate_waste_kg: r.plateWasteKg, kitchen_surplus_kg: r.kitchenSurplusKg,
  produced_kg: r.producedKg, menu: r.menu, details: r.details, comment: r.comment,
});

const toPilot = (r: Row): Pilot => ({
  id: r.id, establishmentId: r.establishment_id, name: r.name, baselineStart: r.baseline_start, baselineEnd: r.baseline_end,
  followupStart: r.followup_start, followupEnd: r.followup_end, targetReductionPct: Number(r.target_reduction_pct), actions: r.actions,
});
const fromPilot = (p: Omit<Pilot, "id">) => ({
  establishment_id: p.establishmentId, name: p.name, baseline_start: p.baselineStart, baseline_end: p.baselineEnd,
  followup_start: p.followupStart, followup_end: p.followupEnd, target_reduction_pct: p.targetReductionPct, actions: p.actions,
});

const toProfile = (r: Row, email = ""): Profile => ({
  id: r.id, email: r.email ?? email, fullName: r.full_name, role: r.role, establishmentId: r.establishment_id,
  collectivityId: r.collectivity_id, active: r.active,
});

/** Traduit les erreurs PostgreSQL / PostgREST en messages compréhensibles. */
function fail(error: { code?: string; message: string } | null): never | void {
  if (!error) return;
  if (error.code === "42501" || /row-level security/i.test(error.message)) throw new AccessError();
  if (error.code === "23505") throw new Error("Une pesée existe déjà pour ce service : modifiez-la depuis l'historique");
  if (error.code === "23514") throw new Error(error.message.includes("waste_not_above_production")
    ? "Le total jeté dépasse la quantité produite" : error.message);
  throw new Error(error.message);
}

export function createSupabaseStore(url: string, anonKey: string): DataStore {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  async function profileOf(id: string, email: string): Promise<Profile | null> {
    const { data, error } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
    fail(error);
    if (!data || !data.active) return null;
    return toProfile(data, email);
  }

  return {
    mode: "supabase",

    async currentUser() {
      const { data } = await sb.auth.getUser();
      if (!data.user) return null;
      return profileOf(data.user.id, data.user.email ?? "");
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error("Adresse ou mot de passe incorrect");
      const profile = await profileOf(data.user.id, data.user.email ?? "");
      if (!profile) {
        await sb.auth.signOut();
        throw new AccessError("Compte désactivé. Contactez votre administrateur.");
      }
      return profile;
    },

    async signOut() {
      await sb.auth.signOut();
    },

    async changePassword(newPassword) {
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },

    async listCollectivities() {
      const { data, error } = await sb.from("collectivities").select("id, name").order("name");
      fail(error);
      return data ?? [];
    },

    async listEstablishments() {
      const { data, error } = await sb.from("establishments").select("*").order("name");
      fail(error);
      return (data ?? []).map(toEstablishment);
    },

    async saveEstablishment(input, id) {
      const q = id
        ? sb.from("establishments").update(fromEstablishment(input)).eq("id", id).select().single()
        : sb.from("establishments").insert(fromEstablishment(input)).select().single();
      const { data, error } = await q;
      fail(error);
      return toEstablishment(data!);
    },

    async listProfiles() {
      const { data, error } = await sb.from("profiles").select("*").order("full_name");
      fail(error);
      return (data ?? []).map((r) => toProfile(r));
    },

    async updateProfile(id, patch) {
      const row: Row = {};
      if (patch.fullName !== undefined) row.full_name = patch.fullName;
      if (patch.role !== undefined) row.role = patch.role;
      if (patch.establishmentId !== undefined) row.establishment_id = patch.establishmentId;
      if (patch.collectivityId !== undefined) row.collectivity_id = patch.collectivityId;
      if (patch.active !== undefined) row.active = patch.active;
      const { error } = await sb.from("profiles").update(row).eq("id", id);
      fail(error);
    },

    async inviteUser(input) {
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new AccessError("Session expirée, reconnectez-vous");
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "L'invitation a échoué");
      }
    },

    async listRecords() {
      const { data, error } = await sb.from("waste_records").select("*").order("service_date", { ascending: false }).limit(5000);
      fail(error);
      return (data ?? []).map(toRecord);
    },

    async saveRecord(input, id) {
      const { data: auth } = await sb.auth.getUser();
      const q = id
        ? sb.from("waste_records").update(fromRecord(input)).eq("id", id).select().single()
        : sb.from("waste_records").insert({ ...fromRecord(input), created_by: auth.user?.id }).select().single();
      const { data, error } = await q;
      fail(error);
      if (!data) throw new AccessError();
      return toRecord(data);
    },

    async deleteRecord(id) {
      const { data, error } = await sb.from("waste_records").delete().eq("id", id).select("id");
      fail(error);
      if (!data?.length) throw new AccessError("Suppression réservée au responsable");
    },

    async listPilots() {
      const { data, error } = await sb.from("pilots").select("*").order("baseline_start", { ascending: false });
      fail(error);
      return (data ?? []).map(toPilot);
    },

    async savePilot(input, id) {
      const q = id
        ? sb.from("pilots").update(fromPilot(input)).eq("id", id).select().single()
        : sb.from("pilots").insert(fromPilot(input)).select().single();
      const { data, error } = await q;
      fail(error);
      return toPilot(data!);
    },

    async deletePilot(id) {
      const { error } = await sb.from("pilots").delete().eq("id", id);
      fail(error);
    },
  };
}
