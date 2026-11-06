import { createDemoStore } from "./demo";
import { createSupabaseStore } from "./supabase";
import type { DataStore } from "./types";

export type DemoStore = ReturnType<typeof createDemoStore>;

let instance: DataStore | null = null;

/** Mode Supabase si les variables d'environnement sont présentes, sinon mode démo. */
export function getStore(): DataStore {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  instance = url && key ? createSupabaseStore(url, key) : createDemoStore();
  return instance;
}

export const isDemo = (s: DataStore): s is DemoStore => s.mode === "demo";
