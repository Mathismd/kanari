"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getStore } from "@/lib/store";
import type { DataStore } from "@/lib/store/types";
import type { Collectivity, Establishment, Pilot, Profile, WasteRecord } from "@/lib/types";

interface SessionData {
  store: DataStore;
  user: Profile;
  collectivities: Collectivity[];
  establishments: Establishment[];
  records: WasteRecord[];
  pilots: Pilot[];
  /** Établissement sélectionné ("all" = tous ceux visibles). */
  scope: string;
  setScope: (s: string) => void;
  scopedRecords: WasteRecord[];
  scopedEstablishments: Establishment[];
  costOf: (establishmentId: string) => number;
  establishmentName: (id: string) => string;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionData | null>(null);

type Status = { kind: "loading" } | { kind: "anonymous" } | { kind: "error"; message: string } | { kind: "ready" };

export function SessionProvider({ children, onAnonymous }: { children: ReactNode; onAnonymous: () => void }) {
  const [store] = useState(() => getStore());
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [user, setUser] = useState<Profile | null>(null);
  const [collectivities, setCollectivities] = useState<Collectivity[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [scope, setScope] = useState("all");

  const reload = useCallback(async () => {
    try {
      const u = await store.currentUser();
      if (!u) {
        setStatus({ kind: "anonymous" });
        onAnonymous();
        return;
      }
      const [c, e, r, p] = await Promise.all([
        store.listCollectivities(),
        store.listEstablishments(),
        store.listRecords(),
        store.listPilots(),
      ]);
      setUser(u);
      setCollectivities(c);
      setEstablishments(e);
      setRecords(r);
      setPilots(p);
      setStatus({ kind: "ready" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Chargement impossible" });
    }
  }, [store, onAnonymous]);

  useEffect(() => {
    // Chargement initial des données de la session (store externe, asynchrone).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const value = useMemo<SessionData | null>(() => {
    if (!user) return null;
    const effectiveScope = scope !== "all" && !establishments.some((e) => e.id === scope) ? "all" : scope;
    const scopedEstablishments = effectiveScope === "all" ? establishments : establishments.filter((e) => e.id === effectiveScope);
    const ids = new Set(scopedEstablishments.map((e) => e.id));
    const costs = new Map(establishments.map((e) => [e.id, e.costPerKg]));
    const names = new Map(establishments.map((e) => [e.id, e.name]));
    return {
      store,
      user,
      collectivities,
      establishments,
      records,
      pilots,
      scope: effectiveScope,
      setScope,
      scopedEstablishments,
      scopedRecords: records.filter((r) => ids.has(r.establishmentId)),
      costOf: (id) => costs.get(id) ?? 5,
      establishmentName: (id) => names.get(id) ?? "Établissement inconnu",
      reload,
      signOut: async () => {
        await store.signOut();
        setUser(null);
        onAnonymous();
      },
    };
  }, [store, user, collectivities, establishments, records, pilots, scope, reload, onAnonymous]);

  if (status.kind === "error") {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="font-semibold">Les données n&apos;ont pas pu être chargées.</p>
          <p className="mt-1 text-sm text-ink-soft">{status.message}</p>
          <button className="mt-4 text-sm font-semibold text-forest underline" onClick={() => void reload()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (status.kind !== "ready" || !value) {
    return (
      <div className="grid min-h-screen place-items-center" aria-busy="true">
        <p className="text-sm text-ink-soft">Chargement…</p>
      </div>
    );
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionData {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession doit être utilisé dans SessionProvider");
  return ctx;
}
