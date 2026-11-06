"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Badge, Button, EmptyState, Field, Input, PageHeader, Panel, Select, errorMessage, useToast } from "@/components/ui";
import { ESTABLISHMENT_TYPE_LABELS, fmtEur, fmtInt } from "@/lib/labels";
import { canManage } from "@/lib/permissions";
import type { Establishment, EstablishmentType } from "@/lib/types";
import { establishmentSchema, firstErrors, parseNumber } from "@/lib/validation";

function EstablishmentForm({ initial, onDone }: { initial?: Establishment; onDone: () => void }) {
  const { user, collectivities, store, reload } = useSession();
  const toast = useToast();
  const isAdmin = user.role === "admin";
  const [v, setV] = useState({
    name: initial?.name ?? "",
    type: (initial?.type ?? "ecole") as EstablishmentType,
    address: initial?.address ?? "",
    commune: initial?.commune ?? "",
    managerName: initial?.managerName ?? "",
    contactEmail: initial?.contactEmail ?? "",
    dailyMeals: initial?.dailyMeals?.toString() ?? "",
    costPerKg: (initial?.costPerKg ?? 5).toString().replace(".", ","),
    targetGPerMeal: initial?.targetGPerMeal?.toString() ?? "",
    collectivityId: initial?.collectivityId ?? "",
    active: initial?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = establishmentSchema.safeParse({
      ...v,
      dailyMeals: parseNumber(v.dailyMeals),
      costPerKg: parseNumber(v.costPerKg) ?? NaN,
      targetGPerMeal: parseNumber(v.targetGPerMeal),
      collectivityId: v.collectivityId || null,
    });
    if (!parsed.success) return setErrors(firstErrors(parsed.error));
    try {
      await store.saveEstablishment(parsed.data, initial?.id);
      await reload();
      toast(initial ? "Établissement modifié" : "Établissement ajouté");
      onDone();
    } catch (err) {
      toast(errorMessage(err), "bad");
    }
  }

  return (
    <Panel title={initial ? `Modifier : ${initial.name}` : "Nouvel établissement"}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" htmlFor="ename" error={errors.name}><Input id="ename" value={v.name} onChange={set("name")} maxLength={150} /></Field>
        <Field label="Type" htmlFor="etype">
          <Select id="etype" value={v.type} onChange={set("type")}>
            {Object.entries(ESTABLISHMENT_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Adresse" htmlFor="eaddr" error={errors.address}><Input id="eaddr" value={v.address} onChange={set("address")} maxLength={250} /></Field>
        <Field label="Commune" htmlFor="ecom" error={errors.commune}><Input id="ecom" value={v.commune} onChange={set("commune")} maxLength={80} /></Field>
        <Field label="Responsable" htmlFor="eman" error={errors.managerName}><Input id="eman" value={v.managerName} onChange={set("managerName")} maxLength={120} /></Field>
        <Field label="Adresse électronique professionnelle" htmlFor="email" error={errors.contactEmail}><Input id="email" type="email" value={v.contactEmail} onChange={set("contactEmail")} /></Field>
        <Field label="Repas servis par jour (environ)" htmlFor="emeals" error={errors.dailyMeals}><Input id="emeals" inputMode="numeric" value={v.dailyMeals} onChange={set("dailyMeals")} /></Field>
        <Field label="Coût d'un kilo jeté (€)" htmlFor="ecost" error={errors.costPerKg} hint="Hypothèse utilisée pour estimer le coût des pertes.">
          <Input id="ecost" inputMode="decimal" value={v.costPerKg} onChange={set("costPerKg")} />
        </Field>
        <Field label="Objectif (g jetés par repas)" htmlFor="etarget" error={errors.targetGPerMeal} hint="Facultatif.">
          <Input id="etarget" inputMode="numeric" value={v.targetGPerMeal} onChange={set("targetGPerMeal")} />
        </Field>
        {isAdmin && (
          <Field label="Collectivité de rattachement" htmlFor="ecoll">
            <Select id="ecoll" value={v.collectivityId} onChange={set("collectivityId")}>
              <option value="">Aucune</option>
              {collectivities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        {isAdmin && initial && (
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium sm:col-span-2">
            <input type="checkbox" className="size-5 accent-forest" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
            Établissement actif (décocher bloque les nouvelles saisies, l&apos;historique est conservé)
          </label>
        )}
        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit">{initial ? "Enregistrer" : "Ajouter l'établissement"}</Button>
          <Button type="button" variant="secondary" onClick={onDone}>Annuler</Button>
        </div>
      </form>
    </Panel>
  );
}

export default function EtablissementsPage() {
  const { user, establishments, collectivities } = useSession();
  const [editing, setEditing] = useState<Establishment | "new" | null>(null);
  const collName = (id: string | null) => collectivities.find((c) => c.id === id)?.name ?? "—";

  if (editing) {
    return (
      <>
        <PageHeader title="Établissements" />
        <EstablishmentForm initial={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Établissements"
        description={user.role === "admin" ? "Ajoutez les cantines, rattachez-les à leur collectivité et réglez l'hypothèse de coût." : "Les établissements auxquels votre compte a accès."}
        action={user.role === "admin" ? <Button onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden /> Ajouter</Button> : undefined}
      />
      {establishments.length === 0 ? (
        <EmptyState title="Aucun établissement" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-paper">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-mist/60 text-[13px] text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Nom</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Commune</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Collectivité</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Repas/jour</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">€/kg</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Statut</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {establishments.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{e.name}</p>
                    <p className="text-[12px] text-ink-soft">{ESTABLISHMENT_TYPE_LABELS[e.type]}{e.managerName ? `, ${e.managerName}` : ""}</p>
                  </td>
                  <td className="px-4 py-3">{e.commune}</td>
                  <td className="px-4 py-3">{collName(e.collectivityId)}</td>
                  <td className="figure tabular-nums px-4 py-3 text-right">{e.dailyMeals ? fmtInt(e.dailyMeals) : "—"}</td>
                  <td className="figure tabular-nums px-4 py-3 text-right">{fmtEur(e.costPerKg).replace(/\s?€/, "")}</td>
                  <td className="px-4 py-3"><Badge tone={e.active ? "good" : "neutral"}>{e.active ? "Actif" : "Désactivé"}</Badge></td>
                  <td className="px-2 py-1 text-right">
                    {canManage(user, e.id) && (
                      <Button variant="ghost" aria-label={`Modifier ${e.name}`} onClick={() => setEditing(e)}><Pencil className="size-4" /></Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
