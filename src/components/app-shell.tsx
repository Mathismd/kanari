"use client";

import clsx from "clsx";
import {
  Building2,
  ClipboardList,
  FlaskConical,
  Gauge,
  Lightbulb,
  LineChart,
  LogOut,
  Menu,
  Plus,
  Scale,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ROLE_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { isDemo } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Logo } from "./logo";
import { useSession } from "./session";
import { Select, useToast } from "./ui";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Gauge;
  show: (r: Role) => boolean;
}

const NAV: NavItem[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: Gauge, show: (r) => r !== "association" },
  { href: "/saisie", label: "Saisir une pesée", icon: Scale, show: can.enterData },
  { href: "/historique", label: "Historique", icon: ClipboardList, show: (r) => r !== "association" },
  { href: "/statistiques", label: "Statistiques", icon: LineChart, show: (r) => r !== "association" },
  { href: "/recommandations", label: "Recommandations", icon: Lightbulb, show: (r) => r !== "association" },
  { href: "/pilotes", label: "Pilotes avant / après", icon: FlaskConical, show: (r) => r !== "association" },
  { href: "/etablissements", label: "Établissements", icon: Building2, show: (r) => r !== "personnel" && r !== "association" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, show: can.viewTeam },
  { href: "/parametres", label: "Paramètres", icon: Settings, show: () => true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, establishments, scope, setScope, signOut, store, reload } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const items = NAV.filter((i) => i.show(user.role));
  const showScope = establishments.length > 1 && pathname !== "/saisie" && pathname !== "/etablissements" && pathname !== "/utilisateurs" && pathname !== "/parametres";

  const nav = (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors",
              active ? "bg-white/12 text-white" : "text-white/75 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 pt-4">
      <p className="truncate text-sm font-semibold text-white">{user.fullName || user.email}</p>
      <p className="text-[13px] text-white/60">{ROLE_LABELS[user.role]}</p>
      <button
        onClick={() => void signOut()}
        className="mt-3 flex min-h-10 items-center gap-2 text-sm font-medium text-white/75 hover:text-white"
      >
        <LogOut className="size-4" aria-hidden /> Se déconnecter
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64 print:pl-0">
      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 print:!hidden flex-col justify-between bg-forest-dark px-4 py-6 lg:flex">
        <div>
          <Link href="/tableau-de-bord" className="mb-8 block px-2">
            <Logo light />
          </Link>
          {nav}
        </div>
        {account}
      </aside>

      {/* Barre supérieure (mobile) */}
      <header className="sticky top-0 z-30 flex print:hidden items-center justify-between bg-forest-dark px-4 py-3 lg:hidden">
        <Logo light />
        <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-lg text-white" aria-label="Ouvrir le menu">
          <Menu className="size-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 flex-col justify-between bg-forest-dark px-4 py-5">
            <div>
              <div className="mb-6 flex justify-end">
                <button onClick={() => setOpen(false)} className="grid size-11 place-items-center text-white" aria-label="Fermer le menu">
                  <X className="size-6" />
                </button>
              </div>
              {nav}
            </div>
            {account}
          </div>
        </div>
      )}

      {isDemo(store) && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 print:hidden border-b border-signal/20 bg-signal-soft px-4 py-2 text-center text-[13px] text-ink">
          <span>Démonstration : données fictives, enregistrées dans ce navigateur uniquement.</span>
          <button
            className="font-semibold text-signal underline underline-offset-2"
            onClick={async () => {
              store.reset();
              await reload();
              toast("Données de démonstration réinitialisées");
            }}
          >
            Réinitialiser
          </button>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        {showScope && (
          <div className="mb-6 flex items-center gap-3 print:hidden">
            <label htmlFor="scope" className="text-sm font-medium text-ink-soft">
              Établissement
            </label>
            <Select id="scope" value={scope} onChange={(e) => setScope(e.target.value)} className="max-w-xs">
              <option value="all">Tous ({establishments.length})</option>
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        {children}
      </main>

      {/* Accès direct à la saisie sur mobile : c'est l'action la plus fréquente du personnel. */}
      {can.enterData(user.role) && pathname !== "/saisie" && (
        <Link
          href="/saisie"
          className="fixed bottom-5 right-5 z-20 flex print:hidden min-h-13 items-center gap-2 rounded-full bg-forest px-5 text-[15px] font-semibold text-white shadow-lg lg:hidden"
        >
          <Plus className="size-5" aria-hidden /> Saisir une pesée
        </Link>
      )}
    </div>
  );
}
