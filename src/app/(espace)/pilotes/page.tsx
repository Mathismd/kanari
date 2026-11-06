"use client";

import { CheckCircle2, Plus, Printer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Badge, Button, EmptyState, Field, Input, Notice, PageHeader, Panel, Select, Textarea, errorMessage, useToast } from "@/components/ui";
import { addDays, todayIso } from "@/lib/dates";
import { fmtDate, fmtEur, fmtG, fmtInt, fmtKg, fmtPct } from "@/lib/labels";
import { MIN_COMPLETENESS, MIN_SERVICES_PER_PERIOD, pilotResult } from "@/lib/metrics";
import { canManage } from "@/lib/permissions";
import type { Pilot } from "@/lib/types";
import { firstErrors, parseNumber, pilotSchema } from "@/lib/validation";

const range = (a: string, b: string | null) => `${fmtDate(a, { day: "numeric", month: "short" })} → ${b ? fmtDate(b, { day: "numeric", month: "short" }) : "aujourd'hui"}`;

function PilotCard({ pilot }: { pilot: Pilot }) {
  const { user, records, establishments, establishmentName, store, reload } = useSession();
  const toast = useToast();
  const est = establishments.find((e) => e.id === pilot.establishmentId);
  const r = useMemo(() => pilotResult(records, pilot, est?.costPerKg ?? 5), [records, pilot, est]);
  const status = !pilot.followupStart ? "Référence en cours" : r.reliable ? (r.targetReached ? "Objectif atteint" : "Objectif non atteint") : "Données insuffisantes";
  const tone = !pilot.followupStart ? "neutral" : r.reliable ? (r.targetReached ? "good" : "warn") : "warn";

  return (
    <article className="rounded-2xl border border-line bg-paper">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">{pilot.name}</h2>
          <p className="text-sm text-ink-soft">{establishmentName(pilot.establishmentId)}, objectif : −{fmtPct(pilot.targetReductionPct)}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Badge tone={tone}>{status}</Badge>
          <Button variant="ghost" aria-label="Imprimer le bilan" onClick={() => window.print()}><Printer className="size-4" /></Button>
          {canManage(user, pilot.establishmentId) && (
            <Button
              variant="ghost"
              aria-label="Supprimer le pilote"
              onClick={async () => {
                if (!window.confirm("Supprimer ce pilote ? Les pesées sont conservées.")) return;
                try { await store.deletePilot(pilot.id); await reload(); toast("Pilote supprimé"); } catch (e) { toast(errorMessage(e), "bad"); }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-px bg-line sm:grid-cols-3">
        <div className="bg-paper p-5">
          <p className="text-[13px] font-medium text-ink-soft">Avant ({range(pilot.baselineStart, pilot.baselineEnd)})</p>
          <p className="figure mt-1 text-3xl font-bold">{r.baseline.gPerMeal === null ? "—" : fmtG(r.baseline.gPerMeal)}</p>
          <p className="text-[13px] text-ink-soft">par repas, {r.baseline.services} services pesés</p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-[13px] font-medium text-ink-soft">
            Après {pilot.followupStart ? `(${range(pilot.followupStart, pilot.followupEnd)})` : ""}
          </p>
          <p className="figure mt-1 text-3xl font-bold">{r.followup?.gPerMeal == null ? "—" : fmtG(r.followup.gPerMeal)}</p>
          <p className="text-[13px] text-ink-soft">{r.followup ? `par repas, ${r.followup.services} services pesés` : "période de suivi non commencée"}</p>
        </div>
        <div className="bg-forest-dark p-5 text-white">
          <p className="text-[13px] font-medium text-white/70">Évolution</p>
          <p className="figure mt-1 text-3xl font-bold">
            {r.reductionPct === null ? "—" : `${r.reductionPct >= 0 ? "−" : "+"}${fmtPct(Math.abs(r.reductionPct))}`}
          </p>
          <p className="text-[13px] text-white/75">
            {r.avoidedKg !== null && r.avoidedKg > 0 ? `${fmtKg(r.avoidedKg)} évités, soit environ ${fmtEur(r.avoidedCost ?? 0)}` : "de grammes jetés par repas"}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-5">
        {pilot.actions && (
          <p className="text-[15px]"><span className="font-semibold">Actions testées : </span>{pilot.actions}</p>
        )}
        {r.warnings.length > 0 ? (
          <Notice tone="warn" title="Résultat à confirmer">
            <ul className="list-disc pl-4">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </Notice>
        ) : r.reliable ? (
          <Notice tone="good" title="Comparaison exploitable">
            Les deux périodes comptent assez de pesées régulières. Le résultat est exprimé par repas servi : il ne dépend pas de la fréquentation.
          </Notice>
        ) : null}
      </div>
    </article>
  );
}

function PilotForm({ onDone }: { onDone: () => void }) {
  const { user, establishments, store, reload } = useSession();
  const toast = useToast();
  const manageable = establishments.filter((e) => canManage(user, e.id));
  const today = todayIso();
  const [v, setV] = useState({
    establishmentId: manageable[0]?.id ?? "",
    name: "",
    baselineStart: today,
    baselineEnd: addDays(today, 13),
    followupStart: addDays(today, 21),
    followupEnd: addDays(today, 34),
    targetReductionPct: "15",
    actions: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = pilotSchema.safeParse({
      ...v,
      followupStart: v.followupStart || null,
      followupEnd: v.followupEnd || null,
      targetReductionPct: parseNumber(v.targetReductionPct) ?? NaN,
    });
    if (!parsed.success) return setErrors(firstErrors(parsed.error));
    try {
      await store.savePilot(parsed.data);
      await reload();
      toast("Pilote créé");
      onDone();
    } catch (err) {
      toast(errorMessage(err), "bad");
    }
  }

  return (
    <Panel title="Nouveau pilote">
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du pilote" htmlFor="pname" error={errors.name} className="sm:col-span-2">
          <Input id="pname" value={v.name} onChange={set("name")} placeholder="Portions ajustées en cycle 3" maxLength={120} />
        </Field>
        {manageable.length > 1 && (
          <Field label="Établissement" htmlFor="pest" className="sm:col-span-2">
            <Select id="pest" value={v.establishmentId} onChange={set("establishmentId")}>
              {manageable.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Référence : début" htmlFor="bs" error={errors.baselineStart}><Input id="bs" type="date" value={v.baselineStart} onChange={set("baselineStart")} /></Field>
        <Field label="Référence : fin" htmlFor="be" error={errors.baselineEnd} hint="Au moins deux semaines, sans rien changer."><Input id="be" type="date" value={v.baselineEnd} onChange={set("baselineEnd")} /></Field>
        <Field label="Suivi : début" htmlFor="fs" error={errors.followupStart} hint="Laissez une semaine pour mettre les actions en place."><Input id="fs" type="date" value={v.followupStart} onChange={set("followupStart")} /></Field>
        <Field label="Suivi : fin" htmlFor="fe" error={errors.followupEnd}><Input id="fe" type="date" value={v.followupEnd} onChange={set("followupEnd")} /></Field>
        <Field label="Objectif de baisse (%)" htmlFor="tg" error={errors.targetReductionPct}><Input id="tg" inputMode="decimal" value={v.targetReductionPct} onChange={set("targetReductionPct")} /></Field>
        <Field label="Actions testées" htmlFor="ac" error={errors.actions} className="sm:col-span-2">
          <Textarea id="ac" rows={3} maxLength={1000} value={v.actions} onChange={set("actions")} placeholder="Pain à la demande, commande calée sur les effectifs de la veille…" />
        </Field>
        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit">Créer le pilote</Button>
          <Button type="button" variant="secondary" onClick={onDone}>Annuler</Button>
        </div>
      </form>
    </Panel>
  );
}

export default function PilotesPage() {
  const { user, pilots, scopedEstablishments, establishments } = useSession();
  const [creating, setCreating] = useState(false);
  const ids = new Set(scopedEstablishments.map((e) => e.id));
  const visible = pilots.filter((p) => ids.has(p.establishmentId));
  const canCreate = establishments.some((e) => canManage(user, e.id));

  return (
    <>
      <PageHeader
        title="Pilotes avant / après"
        description="Prouvez l'effet d'une action : mesurez une période de référence, changez une chose, puis mesurez à nouveau."
        action={canCreate && !creating ? <Button onClick={() => setCreating(true)} className="print:hidden"><Plus className="size-4" aria-hidden /> Nouveau pilote</Button> : undefined}
      />

      <ol className="mb-6 grid gap-3 sm:grid-cols-3 print:hidden">
        {[
          ["Référence", "Deux à quatre semaines de pesées quotidiennes, sans rien changer."],
          ["Actions", "Une ou deux actions précises, annoncées à l'équipe et notées ici."],
          ["Suivi", "Même durée, mêmes pesées. Kanari compare les grammes jetés par repas servi."],
        ].map(([title, text], i) => (
          <li key={title} className="flex gap-3 rounded-xl border border-line bg-paper p-4">
            <span className="figure grid size-7 shrink-0 place-items-center rounded-full bg-leaf-soft text-sm font-bold text-forest">{i + 1}</span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-ink-soft">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mb-4 flex items-start gap-2 text-sm text-ink-soft print:hidden">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
        Un résultat n&apos;est déclaré exploitable qu&apos;avec au moins {fmtInt(MIN_SERVICES_PER_PERIOD)} services pesés et {MIN_COMPLETENESS} % des jours d&apos;école couverts dans chaque période.
      </p>

      {creating && <div className="mb-6"><PilotForm onDone={() => setCreating(false)} /></div>}

      {visible.length === 0 ? (
        <EmptyState title="Aucun pilote pour l'instant">
          {canCreate ? "Créez un pilote pour mesurer l'effet d'une action sur votre gaspillage." : "Les pilotes sont créés par les responsables de cantine."}
        </EmptyState>
      ) : (
        <div className="space-y-4">{visible.map((p) => <PilotCard key={p.id} pilot={p} />)}</div>
      )}
    </>
  );
}
