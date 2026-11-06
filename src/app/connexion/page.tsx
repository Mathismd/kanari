"use client";

import { ArrowLeft, Building2, ChefHat, Landmark, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button, Field, Input } from "@/components/ui";
import { getStore, isDemo } from "@/lib/store";
import { DEMO_IDS } from "@/lib/store/seed";
import type { Profile } from "@/lib/types";

const DEMO_PROFILES = [
  { id: DEMO_IDS.staff, icon: ChefHat, title: "Agent de restauration", text: "Saisit les pesées du service, depuis un téléphone." },
  { id: DEMO_IDS.resp, icon: Building2, title: "Responsable de cantine", text: "Suit son établissement, corrige les saisies, lance des pilotes." },
  { id: DEMO_IDS.coll, icon: Landmark, title: "Collectivité", text: "Compare les écoles de la commune, en lecture seule." },
  { id: DEMO_IDS.admin, icon: ShieldCheck, title: "Administrateur", text: "Gère les établissements, les comptes et les rôles." },
];

const home = (p: Profile) => (p.role === "personnel" ? "/saisie" : "/tableau-de-bord");

export default function ConnexionPage() {
  const router = useRouter();
  const [store] = useState(() => getStore());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    store.currentUser().then((u) => u && router.replace(home(u))).catch(() => {});
  }, [store, router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await store.signIn(email.trim(), password);
      router.replace(home(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
      setBusy(false);
    }
  }

  async function demo(id: string) {
    if (!isDemo(store)) return;
    const user = await store.signInAs(id);
    router.replace(home(user));
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/"><Logo /></Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Retour à l&apos;accueil
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-6">
        {isDemo(store) ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Essayer Kanari</h1>
            <p className="mt-2 max-w-xl text-ink-soft">
              Choisissez un profil. Chaque rôle voit uniquement ce qui le concerne. Les données sont fictives et restent dans ce navigateur.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {DEMO_PROFILES.map(({ id, icon: Icon, title, text }) => (
                <button
                  key={id}
                  onClick={() => void demo(id)}
                  className="flex min-h-24 items-start gap-4 rounded-xl border border-line bg-paper p-5 text-left transition-colors hover:border-forest hover:bg-leaf-soft/30"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-leaf-soft text-forest"><Icon className="size-5" aria-hidden /></span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{text}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-sm">
            <h1 className="text-3xl font-bold tracking-tight">Se connecter</h1>
            <form onSubmit={signIn} className="mt-6 space-y-4">
              <Field label="Adresse électronique" htmlFor="email">
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Mot de passe" htmlFor="password" error={error}>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Button type="submit" disabled={busy} className="w-full">{busy ? "Connexion…" : "Se connecter"}</Button>
            </form>
            <p className="mt-6 text-sm text-ink-soft">
              Pas encore de compte ? Les comptes sont créés sur invitation par l&apos;administrateur de votre collectivité.
              Mot de passe oublié : contactez-le pour recevoir un nouveau lien.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
