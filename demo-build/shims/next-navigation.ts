// Remplace next/navigation dans la version démo autonome : routage par l'ancre de l'adresse (#saisie…).
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const current = () => "/" + decodeURIComponent(window.location.hash.slice(1));

export function usePathname(): string {
  return useSyncExternalStore(subscribe, current, () => "/");
}

const go = (path: string) => {
  window.location.hash = path === "/" ? "" : path.replace(/^\//, "");
};

export function useRouter() {
  return { push: go, replace: go, back: () => window.history.back(), refresh: () => {} };
}
