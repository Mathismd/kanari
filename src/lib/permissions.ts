import type { Establishment, Profile, Role, WasteRecord } from "./types";

// Mêmes règles que les fonctions SQL can_read / can_write / can_manage_establishment.
// En mode Supabase, la base fait foi ; ces fonctions servent à l'affichage et au mode démo.

export function canRead(user: Profile, est: Pick<Establishment, "id" | "collectivityId">): boolean {
  if (!user.active) return false;
  if (user.role === "admin") return true;
  if (user.role === "responsable" || user.role === "personnel") return user.establishmentId === est.id;
  if (user.role === "collectivite") return !!user.collectivityId && user.collectivityId === est.collectivityId;
  return false;
}

export function canWrite(user: Profile, est: Pick<Establishment, "id" | "active">): boolean {
  if (!user.active) return false;
  if (user.role === "admin") return true;
  return (user.role === "responsable" || user.role === "personnel") && user.establishmentId === est.id && est.active;
}

export function canManage(user: Profile, establishmentId: string): boolean {
  if (!user.active) return false;
  return user.role === "admin" || (user.role === "responsable" && user.establishmentId === establishmentId);
}

/** Le personnel peut corriger sa propre saisie pendant 48 h ; le responsable et l'admin à tout moment. */
export function canEditRecord(user: Profile, record: WasteRecord, est: Establishment | undefined, now = Date.now()): boolean {
  if (!est) return false;
  if (canManage(user, record.establishmentId)) return true;
  return (
    record.createdBy === user.id &&
    canWrite(user, est) &&
    now - new Date(record.createdAt).getTime() < 48 * 3600 * 1000
  );
}

export const can = {
  enterData: (r: Role) => r === "admin" || r === "responsable" || r === "personnel",
  managePilots: (r: Role) => r === "admin" || r === "responsable",
  manageEstablishments: (r: Role) => r === "admin",
  editOwnEstablishment: (r: Role) => r === "admin" || r === "responsable",
  manageUsers: (r: Role) => r === "admin",
  viewTeam: (r: Role) => r === "admin" || r === "responsable",
  compareEstablishments: (r: Role) => r === "admin" || r === "collectivite",
};
