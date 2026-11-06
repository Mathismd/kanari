"use client";

import { useState } from "react";
import { useSession } from "@/components/session";
import { Button, Field, Input, Notice, PageHeader, Panel, errorMessage, useToast } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/labels";

export default function ParametresPage() {
  const { user, store, reload, establishmentName, collectivities } = useSession();
  const toast = useToast();
  const [fullName, setFullName] = useState(user.fullName);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwError, setPwError] = useState("");

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    try {
      await store.updateProfile(user.id, { fullName: fullName.trim().slice(0, 120) });
      await reload();
      toast("Nom enregistré");
    } catch (err) {
      toast(errorMessage(err), "bad");
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 12) return setPwError("12 caractères minimum");
    if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return setPwError("Mélangez lettres et chiffres");
    if (pw !== pw2) return setPwError("Les deux mots de passe diffèrent");
    setPwError("");
    try {
      await store.changePassword(pw);
      setPw("");
      setPw2("");
      toast("Mot de passe modifié");
    } catch (err) {
      setPwError(errorMessage(err));
    }
  }

  const attachment =
    user.role === "admin" ? "Toute la plateforme"
    : user.role === "collectivite" ? collectivities.find((c) => c.id === user.collectivityId)?.name ?? "Non rattaché"
    : user.establishmentId ? establishmentName(user.establishmentId) : "Non rattaché";

  return (
    <>
      <PageHeader title="Paramètres du compte" />
      <div className="grid max-w-3xl gap-4">
        <Panel title="Mon compte">
          <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-ink-soft">Adresse</dt><dd className="font-medium">{user.email}</dd></div>
            <div><dt className="text-ink-soft">Rôle</dt><dd className="font-medium">{ROLE_LABELS[user.role]}</dd></div>
            <div><dt className="text-ink-soft">Rattachement</dt><dd className="font-medium">{attachment}</dd></div>
          </dl>
          <form onSubmit={saveName} className="flex flex-wrap items-end gap-3">
            <Field label="Nom affiché" htmlFor="fn" className="min-w-64 flex-1">
              <Input id="fn" value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary">Enregistrer le nom</Button>
          </form>
        </Panel>

        <Panel title="Mot de passe">
          {store.mode === "demo" ? (
            <Notice>En démonstration, les comptes n&apos;ont pas de mot de passe.</Notice>
          ) : (
            <form onSubmit={savePassword} noValidate className="grid gap-4 sm:grid-cols-2">
              <Field label="Nouveau mot de passe" htmlFor="pw" hint="12 caractères minimum, lettres et chiffres.">
                <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              </Field>
              <Field label="Confirmer" htmlFor="pw2" error={pwError}>
                <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </Field>
              <div className="sm:col-span-2"><Button type="submit">Changer le mot de passe</Button></div>
            </form>
          )}
        </Panel>

        <Panel title="Vos données">
          <p className="text-sm leading-relaxed text-ink-soft">
            Kanari n&apos;enregistre aucune donnée sur les élèves : uniquement des effectifs, des pesées et les comptes du personnel.
            Les données d&apos;un établissement ne sont visibles que par son équipe, sa collectivité de rattachement et l&apos;administrateur.
          </p>
        </Panel>
      </div>
    </>
  );
}
