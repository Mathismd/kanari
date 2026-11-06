"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GramsLine, RankBars, WasteBars } from "@/components/charts";
import { Delta, Figure, Readout } from "@/components/readout";
import { useSession } from "@/components/session";
import { Badge, EmptyState, PageHeader, Panel, cx } from "@/components/ui";
import { toChart } from "@/lib/chart-data";
import { addDays, todayIso } from "@/lib/dates";
import { fmtEur, fmtG, fmtInt, fmtKg, fmtPct } from "@/lib/labels";
import { change, completeness, dailySeries, inRange, series, summarize } from "@/lib/metrics";
import { can } from "@/lib/permissions";
import { recommend } from "@/lib/recommendations";

const PERIODS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "3 mois" },
];

export default function DashboardPage() {
  const { user, scopedRecords, scopedEstablishments, costOf, scope, establishments } = useSession();
  const [days, setDays] = useState(30);
  const today = todayIso();

  const view = useMemo(() => {
    const from = addDays(today, -(days - 1));
    const prevFrom = addDays(from, -days);
    const current = inRange(scopedRecords, from, today);
    const previous = inRange(scopedRecords, prevFrom, addDays(from, -1));
    const s = summarize(current, costOf);
    const p = summarize(previous, costOf);
    const chart = days <= 30 ? toChart(dailySeries(scopedRecords, from, today, costOf), "jour") : toChart(series(current, "semaine", costOf), "semaine");
    const ids = scopedEstablishments.filter((e) => e.active).map((e) => e.id);
    const perEst = scopedEstablishments
      .map((e) => ({ label: e.name, value: Math.round(summarize(current.filter((r) => r.establishmentId === e.id), costOf).gPerMeal ?? 0) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
    return {
      s,
      deltaG: change(s.gPerMeal, p.gPerMeal),
      deltaKg: change(s.wasteKg, p.wasteKg),
      chart,
      completeness: completeness(scopedRecords, ids, from, today),
      perEst,
      recos: recommend(scopedRecords, scopedEstablishments, today, costOf).slice(0, 3),
    };
  }, [scopedRecords, scopedEstablishments, costOf, days, today]);

  const target = scopedEstablishments.length === 1 ? scopedEstablishments[0].targetGPerMeal : null;
  const { s } = view;

  if (establishments.length === 0) {
    return (
      <>
        <PageHeader title="Tableau de bord" />
        <EmptyState title="Votre compte n'est rattaché à aucun établissement">
          Demandez à l&apos;administrateur de vous associer à votre cantine ou à votre collectivité.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={scope === "all" && scopedEstablishments.length > 1 ? `${scopedEstablishments.length} établissements` : scopedEstablishments[0]?.name}
        action={
          <div role="group" aria-label="Période" className="inline-flex rounded-lg border border-line bg-paper p-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                aria-pressed={days === p.days}
                className={cx("min-h-9 rounded-md px-3 text-sm font-medium", days === p.days ? "bg-forest text-white" : "text-ink-soft hover:text-ink")}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {s.services === 0 ? (
        <EmptyState
          title="Aucune pesée sur cette période"
          action={can.enterData(user.role) ? <Link href="/saisie" className="font-semibold text-forest underline">Saisir la première pesée</Link> : undefined}
        >
          Les indicateurs apparaissent dès la première pesée enregistrée.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
            <Readout
              caption="Jetés par repas servi"
              value={s.gPerMeal === null ? "—" : fmtInt(s.gPerMeal)}
              footer={
                <div className="space-y-1.5">
                  <p><Delta value={view.deltaG} /></p>
                  {target ? (
                    <p>
                      Objectif : {fmtG(target)}{" "}
                      {s.gPerMeal !== null && (s.gPerMeal <= target ? <span className="text-leaf">atteint</span> : <span className="text-amber-300">{fmtG(s.gPerMeal - target)} au-dessus</span>)}
                    </p>
                  ) : null}
                </div>
              }
            />
            <div className="grid grid-cols-2 gap-x-6 rounded-2xl border border-line bg-paper px-6 py-3 sm:grid-cols-3">
              <Figure label="Nourriture jetée" value={fmtKg(s.wasteKg)} sub={view.deltaKg === null ? undefined : `${view.deltaKg > 0 ? "+" : ""}${fmtPct(view.deltaKg)} vs avant`} />
              <Figure label="Restes d'assiette" value={fmtKg(s.plateKg)} sub={`${fmtPct((s.plateKg / s.wasteKg) * 100)} des pertes`} />
              <Figure label="Excédents non servis" value={fmtKg(s.surplusKg)} sub={`${fmtPct((s.surplusKg / s.wasteKg) * 100)} des pertes`} />
              <Figure label="Repas servis" value={fmtInt(s.mealsServed)} sub={s.forecastGap !== null ? `${fmtInt(s.mealsPlanned)} prévus` : undefined} />
              <Figure label="Taux de gaspillage" value={s.wasteRate === null ? "—" : fmtPct(s.wasteRate)} sub={s.wasteRate === null ? "production non pesée" : `de ${fmtKg(s.producedKg)} produits`} />
              <Figure label="Coût estimé" value={fmtEur(s.cost)} sub={<Link href="/etablissements" className="underline decoration-line underline-offset-2">hypothèse €/kg</Link>} />
            </div>
          </div>

          {view.completeness !== null && view.completeness < 80 && (
            <p className="mt-3 text-sm text-signal">
              Pesées enregistrées sur {fmtPct(view.completeness)} des jours d&apos;école : les chiffres de cette période sont à prendre avec prudence.
            </p>
          )}

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <Panel title="Ce qui part à la poubelle">
              <WasteBars data={view.chart} />
            </Panel>
            <Panel title="Grammes jetés par repas servi">
              <GramsLine data={view.chart} target={target} />
            </Panel>
          </div>

          <div className={cx("mt-4 grid gap-4", can.compareEstablishments(user.role) && view.perEst.length > 1 && "xl:grid-cols-2")}>
            <Panel title="À regarder en priorité" action={<Link href="/recommandations" className="inline-flex items-center gap-1 text-sm font-semibold text-forest">Toutes les recommandations <ArrowRight className="size-4" aria-hidden /></Link>}>
              <ul className="divide-y divide-line">
                {view.recos.map((r) => (
                  <li key={r.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <Badge tone={r.level === "alerte" ? "warn" : r.level === "positif" ? "good" : "neutral"}>
                      {r.level === "alerte" ? "Alerte" : r.level === "positif" ? "Progrès" : "Conseil"}
                    </Badge>
                    <div>
                      <p className="font-semibold leading-snug">{r.title}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">{r.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
            {can.compareEstablishments(user.role) && view.perEst.length > 1 && (
              <Panel title="Comparaison des établissements (g par repas)">
                <RankBars data={view.perEst} unit="g" highlightFirst ariaLabel="Grammes jetés par repas, par établissement" />
              </Panel>
            )}
          </div>
        </>
      )}
    </>
  );
}
