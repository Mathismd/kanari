import { todayIso } from "../dates";
import { canEditRecord, canManage, canRead, canWrite } from "../permissions";
import type { Establishment, Profile, WasteRecord } from "../types";
import { buildDemoState, DEMO_VERSION, type DemoState } from "./seed";
import { AccessError, type DataStore } from "./types";

const KEY = "kanari-demo";

function load(): DemoState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === DEMO_VERSION) return parsed;
    }
  } catch {
    // stockage indisponible (navigation privée…) : on repart des données de démo
  }
  return buildDemoState(todayIso());
}

const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

/**
 * Mode démo : données fictives conservées dans le navigateur, mêmes règles d'accès que la base.
 * Aucune donnée ne quitte le poste.
 */
export function createDemoStore(): DataStore & { reset(): void; signInAs(userId: string): Promise<Profile> } {
  let state = load();

  const save = () => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // ignoré : la démo reste utilisable en mémoire
    }
  };

  const me = (): Profile => {
    const user = state.profiles.find((p) => p.id === state.sessionUserId);
    if (!user || !user.active) throw new AccessError("Session expirée, reconnectez-vous");
    return user;
  };

  const est = (id: string): Establishment => {
    const e = state.establishments.find((x) => x.id === id);
    if (!e) throw new Error("Établissement introuvable");
    return e;
  };

  const readable = (user: Profile) => new Set(state.establishments.filter((e) => canRead(user, e)).map((e) => e.id));

  const clone = <T,>(v: T): T => structuredClone(v);

  return {
    mode: "demo",

    reset() {
      const session = state.sessionUserId;
      state = buildDemoState(todayIso());
      state.sessionUserId = session;
      save();
    },

    async currentUser() {
      return clone(state.profiles.find((p) => p.id === state.sessionUserId && p.active) ?? null);
    },

    async signInAs(userId) {
      const user = state.profiles.find((p) => p.id === userId && p.active);
      if (!user) throw new AccessError("Compte de démonstration introuvable");
      state.sessionUserId = user.id;
      save();
      return clone(user);
    },

    async signIn() {
      throw new AccessError("En mode démo, choisissez un profil de démonstration.");
    },

    async signOut() {
      state.sessionUserId = null;
      save();
    },

    async changePassword() {
      throw new AccessError("Pas de mot de passe en mode démo.");
    },

    async listCollectivities() {
      const user = me();
      return clone(state.collectivities.filter((c) => user.role === "admin" || c.id === user.collectivityId));
    },

    async listEstablishments() {
      const user = me();
      return clone(state.establishments.filter((e) => canRead(user, e)));
    },

    async saveEstablishment(input, id) {
      const user = me();
      if (id) {
        const current = est(id);
        if (!canManage(user, id)) throw new AccessError();
        if (user.role !== "admin" && (input.collectivityId !== current.collectivityId || input.active !== current.active)) {
          throw new AccessError("Rattachement et statut modifiables par l'administrateur uniquement");
        }
        Object.assign(current, input);
        save();
        return clone(current);
      }
      if (user.role !== "admin") throw new AccessError();
      const created: Establishment = { ...input, id: uid("e") };
      state.establishments.push(created);
      save();
      return clone(created);
    },

    async listProfiles() {
      const user = me();
      if (user.role === "admin") return clone(state.profiles);
      if (user.role === "responsable") return clone(state.profiles.filter((p) => p.id === user.id || p.establishmentId === user.establishmentId));
      return clone(state.profiles.filter((p) => p.id === user.id));
    },

    async updateProfile(id, patch) {
      const user = me();
      const target = state.profiles.find((p) => p.id === id);
      if (!target) throw new Error("Utilisateur introuvable");
      const privileged = patch.role !== undefined || patch.establishmentId !== undefined || patch.collectivityId !== undefined || patch.active !== undefined;
      if (user.role !== "admin" && (id !== user.id || privileged)) throw new AccessError("Modification réservée à l'administrateur");
      if (patch.fullName !== undefined) target.fullName = patch.fullName.slice(0, 120);
      if (patch.role !== undefined) target.role = patch.role;
      if (patch.establishmentId !== undefined) target.establishmentId = patch.establishmentId;
      if (patch.collectivityId !== undefined) target.collectivityId = patch.collectivityId;
      if (patch.active !== undefined) target.active = patch.active;
      save();
    },

    async inviteUser(input) {
      const user = me();
      if (user.role !== "admin") throw new AccessError();
      const email = input.email.trim().toLowerCase();
      if (state.profiles.some((p) => p.email === email)) throw new Error("Cette adresse a déjà un compte");
      state.profiles.push({
        id: uid("u"),
        email,
        fullName: input.fullName.trim(),
        role: input.role,
        establishmentId: input.establishmentId,
        collectivityId: input.collectivityId,
        active: true,
      });
      save();
    },

    async listRecords() {
      const ids = readable(me());
      return clone(state.records.filter((r) => ids.has(r.establishmentId)));
    },

    async saveRecord(input, id) {
      const user = me();
      const e = est(input.establishmentId);
      if (id) {
        const current = state.records.find((r) => r.id === id);
        if (!current) throw new Error("Pesée introuvable");
        if (!canEditRecord(user, current, est(current.establishmentId))) throw new AccessError("Vous ne pouvez plus modifier cette pesée");
        if (current.establishmentId !== input.establishmentId && user.role !== "admin") throw new AccessError("Établissement non modifiable");
        Object.assign(current, input);
        save();
        return clone(current);
      }
      if (!canWrite(user, e)) throw new AccessError("Saisie non autorisée pour cet établissement");
      if (state.records.some((r) => r.establishmentId === input.establishmentId && r.serviceDate === input.serviceDate && r.service === input.service)) {
        throw new Error("Une pesée existe déjà pour ce service : modifiez-la depuis l'historique");
      }
      const created: WasteRecord = { ...input, id: uid("w"), createdBy: user.id, createdAt: new Date().toISOString() };
      state.records.push(created);
      save();
      return clone(created);
    },

    async deleteRecord(id) {
      const user = me();
      const current = state.records.find((r) => r.id === id);
      if (!current) return;
      if (!canManage(user, current.establishmentId)) throw new AccessError("Suppression réservée au responsable");
      state.records = state.records.filter((r) => r.id !== id);
      save();
    },

    async listPilots() {
      const ids = readable(me());
      return clone(state.pilots.filter((p) => ids.has(p.establishmentId)));
    },

    async savePilot(input, id) {
      const user = me();
      if (!canManage(user, input.establishmentId)) throw new AccessError();
      if (id) {
        const current = state.pilots.find((p) => p.id === id);
        if (!current || !canManage(user, current.establishmentId)) throw new AccessError();
        Object.assign(current, input);
        save();
        return clone(current);
      }
      const created = { ...input, id: uid("p") };
      state.pilots.push(created);
      save();
      return clone(created);
    },

    async deletePilot(id) {
      const user = me();
      const current = state.pilots.find((p) => p.id === id);
      if (!current) return;
      if (!canManage(user, current.establishmentId)) throw new AccessError();
      state.pilots = state.pilots.filter((p) => p.id !== id);
      save();
    },
  };
}
