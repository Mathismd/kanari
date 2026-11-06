import type {
  Collectivity,
  Establishment,
  EstablishmentInput,
  Pilot,
  PilotInput,
  Profile,
  Role,
  WasteRecord,
  WasteRecordInput,
} from "../types";

export interface InviteInput {
  email: string;
  fullName: string;
  role: Role;
  establishmentId: string | null;
  collectivityId: string | null;
}

export interface ProfilePatch {
  fullName?: string;
  role?: Role;
  establishmentId?: string | null;
  collectivityId?: string | null;
  active?: boolean;
}

/** Couche d'accès aux données : implémentée en mode démo (navigateur) et en mode Supabase. */
export interface DataStore {
  mode: "demo" | "supabase";

  currentUser(): Promise<Profile | null>;
  signIn(email: string, password: string): Promise<Profile>;
  signOut(): Promise<void>;
  changePassword(newPassword: string): Promise<void>;

  listCollectivities(): Promise<Collectivity[]>;
  listEstablishments(): Promise<Establishment[]>;
  saveEstablishment(input: EstablishmentInput, id?: string): Promise<Establishment>;

  listProfiles(): Promise<Profile[]>;
  updateProfile(id: string, patch: ProfilePatch): Promise<void>;
  inviteUser(input: InviteInput): Promise<void>;

  listRecords(): Promise<WasteRecord[]>;
  saveRecord(input: WasteRecordInput, id?: string): Promise<WasteRecord>;
  deleteRecord(id: string): Promise<void>;

  listPilots(): Promise<Pilot[]>;
  savePilot(input: PilotInput, id?: string): Promise<Pilot>;
  deletePilot(id: string): Promise<void>;
}

export class AccessError extends Error {
  constructor(message = "Action non autorisée pour votre rôle") {
    super(message);
    this.name = "AccessError";
  }
}
