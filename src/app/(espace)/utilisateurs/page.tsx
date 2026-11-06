"use client";

import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Badge, Button, Field, Input, Notice, PageHeader, Panel, Select, errorMessage, useToast } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/labels";
import type { Profile, Role } from "@/lib/types";

const ASSIGNABLE: Role[] = ["personnel", "responsable", "collectivite", "admin"];

function InviteForm({ onDone }: { onDone: () => void }) {
  const { store, establishments, collectivities } = useSession();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("personnel");
  const [establishmentId, setEstablishmentId] = useState(establishments[0]?.id ?? "");
  const [collectivityId, setCollectivityId] = useState(collectivities[0]?.id ?? "");
  const [error, setError] = useState("");
  const needsEst = role === "personnel" || role === "responsable";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Adresse électronique invalide");
    if (fullName.trim().length < 2) return setError("Indiquez le nom de la personne");
    setError("");
    try {
      await store.inviteUser({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        establishmentId: needsEst ? establishmentId : null,
        collectivityId: role === "collectivite" ? collectivityId : null,
      });
      toast(store.mode === "demo" ? "Compte créé" : `Invitation envoyée à ${email.trim()}`);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Panel title="Inviter une personne">
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" htmlFor="ifn"><Input id="ifn" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} /></Field>
        <Field label="Adresse électronique professionnelle" htmlFor="iem"><Input id="iem" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Rôle" htmlFor="irole">
          <Select id="irole" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </Field>
        {needsEst && (
          <Field label="Établissement" htmlFor="iest">
            <Select id="iest" value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)}>
              {establishments.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </Field>
        )}
        {role === "collectivite" && (
          <Field label="Collectivité" htmlFor="icoll">
            <Select id="icoll" value={collectivityId} onChange={(e) => setCollectivityId(e.target.value)}>
              {collectivities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </Field>
        )}
        {error && <p className="text-sm text-danger sm:col-span-2" role="alert">{error}</p>}
        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit">{store.mode === "demo" ? "Créer le compte" : "Envoyer l'invitation"}</Button>
          <Button type="button" variant="secondary" onClick={onDone}>Annuler</Button>
        </div>
      </form>
    </Panel>
  );
}

export default function UtilisateursPage() {
  const { user, store, establishments, collectivities } = useSession();
  const toast = useToast();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [inviting, setInviting] = useState(false);
  const isAdmin = user.role === "admin";

  const load = () => store.listProfiles().then(setProfiles).catch((e) => toast(errorMessage(e), "bad"));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function patch(p: Profile, change: Partial<Profile>) {
    try {
      await store.updateProfile(p.id, change);
      await load();
      toast("Utilisateur mis à jour");
    } catch (e) {
      toast(errorMessage(e), "bad");
    }
  }

  const estName = (id: string | null) => establishments.find((e) => e.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        title={isAdmin ? "Utilisateurs" : "Mon équipe"}
        description={isAdmin ? "Les comptes sont créés sur invitation. Un nouveau compte ne voit aucune donnée tant qu'il n'est pas rattaché." : "Les personnes rattachées à votre établissement."}
        action={isAdmin && !inviting ? <Button onClick={() => setInviting(true)}><UserPlus className="size-4" aria-hidden /> Inviter</Button> : undefined}
      />
      {inviting && <div className="mb-6"><InviteForm onDone={() => { setInviting(false); void load(); }} /></div>}
      {isAdmin && (
        <div className="mb-4">
          <Notice>Vous ne pouvez pas modifier votre propre rôle ni désactiver votre compte, pour éviter de perdre l&apos;accès administrateur.</Notice>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-paper">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-mist/60 text-[13px] text-ink-soft">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Personne</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Rôle</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Rattachement</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(profiles ?? []).map((p) => {
              const editable = isAdmin && p.id !== user.id;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{p.fullName || "Sans nom"}</p>
                    <p className="text-[12px] text-ink-soft">{p.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {editable ? (
                      <Select aria-label={`Rôle de ${p.fullName}`} value={p.role} onChange={(e) => void patch(p, { role: e.target.value as Role })} className="min-w-48">
                        {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </Select>
                    ) : ROLE_LABELS[p.role]}
                  </td>
                  <td className="px-4 py-3">
                    {editable && (p.role === "personnel" || p.role === "responsable") ? (
                      <Select aria-label={`Établissement de ${p.fullName}`} value={p.establishmentId ?? ""} onChange={(e) => void patch(p, { establishmentId: e.target.value || null })} className="min-w-48">
                        <option value="">Non rattaché</option>
                        {establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </Select>
                    ) : editable && p.role === "collectivite" ? (
                      <Select aria-label={`Collectivité de ${p.fullName}`} value={p.collectivityId ?? ""} onChange={(e) => void patch(p, { collectivityId: e.target.value || null })} className="min-w-48">
                        <option value="">Non rattachée</option>
                        {collectivities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                    ) : p.role === "collectivite" ? (
                      collectivities.find((c) => c.id === p.collectivityId)?.name ?? "—"
                    ) : p.role === "admin" ? "Toute la plateforme" : estName(p.establishmentId)}
                  </td>
                  <td className="px-4 py-3">
                    {editable ? (
                      <button onClick={() => void patch(p, { active: !p.active })} className="text-left" aria-label={p.active ? `Désactiver ${p.fullName}` : `Réactiver ${p.fullName}`}>
                        <Badge tone={p.active ? "good" : "neutral"}>{p.active ? "Actif" : "Désactivé"}</Badge>
                        <span className="ml-2 text-[12px] text-ink-soft underline">{p.active ? "désactiver" : "réactiver"}</span>
                      </button>
                    ) : (
                      <Badge tone={p.active ? "good" : "neutral"}>{p.active ? "Actif" : "Désactivé"}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {profiles === null && <p className="p-4 text-sm text-ink-soft">Chargement…</p>}
      </div>
    </>
  );
}
