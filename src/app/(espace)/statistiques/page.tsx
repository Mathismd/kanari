"use client";

import { useMemo, useState } from "react";
import { CostLine, GramsLine, RankBars, WasteBars } from "@/components/charts";
import { useSession } from "@/components/session";
import { EmptyState, Field, Input, PageHeader, Panel, Select, cx } from "@/components/ui";
import { toChart } from "@/lib/chart-data";
import { addDays, monthKey, todayIso, weekStart } from "@/lib/dates";
import { CATEGORIES, CATEGORY_LABELS, WEEKDAYS, fmtEur, fmtG, fmtInt, fmtKg } from "@/lib/labels";
import { byCategory, byWeekday, inRange, menuRanking, series, summarize, type Granularity } from "@/lib/metrics";
import { can } from "@/lib/permissions";
import type { Category } from "@/lib/types";

export default function StatistiquesPage() {
  const { user, scopedRecords, scopedEstablishments, costOf } = useSession();
  const today = todayIso();
  const [from, setFrom] = useState(addDays(today, -90));
  const [to, setTo] = useState(today);
  const [granularity, setGranularity] = useState<Granularity>("semaine");
  const [category, setCategory] = useState<Category | "">("");

  const data = useMemo(() => {
    const records = inRange(scopedRecords, from, to);
    const s = summarize(records, costOf);
    const points = series(records, granularity, costOf);
    const chart = toChart(points, granularity);
    const cats = byCategory(records);
    const withDetails = records.filter((r) => r.details.length > 0).length;
    const weekdays = byWeekday(records).filter((d) => d.gPerMeal !== null);
    const menus = menuRanking(records).slice(0, 8);
    const perEst = scopedEstablishments
      .map((e) => ({ label: e.name, value: Math.round(summarize(records.filter((r) => r.establishmentId === e.id), costOf).gPerMeal ?? 0) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    let categorySeries: { label: string; value: number }[] = [];
    if (category) {
      const keyOf = (d: string) => (granularity === "jour" ? d : granularity === "semaine" ? weekStart(d) : monthKey(d));
      const acc = new Map<string, number>();
      for (const r of records) for (const d of r.details) if (d.category === category) acc.set(keyOf(r.serviceDate), (acc.get(keyOf(r.serviceDate)) ?? 0) + d.kg);
      const labels = new Map(points.map((p, i) => [p.key, chart[i].label]));
      categorySeries = [...acc.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ label: labels.get(k) ?? k, value: Math.round(v * 10) / 10 }));
    }
    return { s, chart, cats, withDetails, weekdays, menus, perEst, records, categorySeries };
  }, [scopedRecords, scopedEstablishments, from, to, granularity, category, costOf]);

  const target = scopedEstablishments.length === 1 ? scopedEstablishments[0].targetGPerMeal : null;

  return (
    <>
      <PageHeader title="Statistiques" description="Les comparaisons utilisent les grammes jetés par repas servi, pour neutraliser les variations de fréquentation." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Du" htmlFor="from"><Input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Au" htmlFor="to"><Input id="to" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Regrouper par" htmlFor="gran">
          <Select id="gran" value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)}>
            <option value="jour">Jour</option>
            <option value="semaine">Semaine</option>
            <option value="mois">Mois</option>
          </Select>
        </Field>
        <Field label="Catégorie alimentaire" htmlFor="cat">
          <Select id="cat" value={category} onChange={(e) => setCategory(e.target.value as Category | "")}>
            <option value="">Toutes</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </Select>
        </Field>
      </div>

      {data.records.length === 0 ? (
        <EmptyState title="Aucune pesée sur cette période" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {[
              ["Services pesés", fmtInt(data.s.services)],
              ["Nourriture jetée", fmtKg(data.s.wasteKg)],
              ["Par repas servi", data.s.gPerMeal === null ? "—" : fmtG(data.s.gPerMeal)],
              ["Coût estimé", fmtEur(data.s.cost)],
            ].map(([label, value]) => (
              <div key={label} className="bg-paper px-5 py-4">
                <p className="text-[13px] text-ink-soft">{label}</p>
                <p className="figure mt-0.5 text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Kilos jetés"><WasteBars data={data.chart} /></Panel>
            <Panel title="Grammes jetés par repas servi"><GramsLine data={data.chart} target={target} /></Panel>
          </div>

          {category && (
            <Panel title={`${CATEGORY_LABELS[category]} : kilos jetés`}>
              {data.categorySeries.length ? (
                <RankBars data={data.categorySeries} unit="kg" ariaLabel={`Kilos jetés pour ${CATEGORY_LABELS[category]}`} />
              ) : (
                <p className="text-sm text-ink-soft">Aucun détail renseigné pour cette catégorie sur la période.</p>
              )}
            </Panel>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Répartition par catégorie">
              {data.cats.length ? (
                <>
                  <RankBars data={data.cats.map((c) => ({ label: CATEGORY_LABELS[c.category], value: c.share }))} unit="%" highlightFirst ariaLabel="Part des pertes par catégorie" />
                  <p className="mt-3 text-[13px] text-ink-soft">Calculé sur les {data.withDetails} services où le détail a été renseigné.</p>
                </>
              ) : (
                <p className="text-sm text-ink-soft">Le détail par catégorie est facultatif. Renseignez-le dans « Détails » lors de la saisie pour voir cette répartition.</p>
              )}
            </Panel>
            <Panel title="Par jour de la semaine (g par repas)">
              <RankBars
                data={data.weekdays.map((d) => ({ label: WEEKDAYS[d.dow].replace(/^./, (c) => c.toUpperCase()), value: Math.round(d.gPerMeal ?? 0) }))}
                unit="g"
                ariaLabel="Grammes jetés par repas selon le jour"
              />
            </Panel>
          </div>

          <div className={cx("grid gap-4", can.compareEstablishments(user.role) && data.perEst.length > 1 && "xl:grid-cols-2")}>
            <Panel title="Menus les plus gaspillés">
              {data.menus.length ? (
                <table className="w-full text-left text-sm">
                  <thead className="text-[13px] text-ink-soft">
                    <tr>
                      <th scope="col" className="pb-2 font-medium">Menu</th>
                      <th scope="col" className="pb-2 text-right font-medium">Services</th>
                      <th scope="col" className="pb-2 text-right font-medium">g/repas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.menus.map((m) => (
                      <tr key={m.menu}>
                        <td className="py-2.5 pr-3">{m.menu}</td>
                        <td className="figure tabular-nums py-2.5 text-right text-ink-soft">{m.services}</td>
                        <td className="figure tabular-nums py-2.5 text-right font-semibold">{fmtInt(m.gPerMeal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-ink-soft">Renseignez le menu lors de la saisie pour obtenir ce classement.</p>
              )}
            </Panel>
            {can.compareEstablishments(user.role) && data.perEst.length > 1 && (
              <Panel title="Comparaison des établissements (g par repas)">
                <RankBars data={data.perEst} unit="g" highlightFirst ariaLabel="Grammes jetés par repas par établissement" />
              </Panel>
            )}
          </div>

          <Panel title="Coût estimé des pertes">
            <CostLine data={data.chart} />
            <p className="mt-3 text-[13px] text-ink-soft">Kilos jetés multipliés par le coût au kilo défini pour chaque établissement. C&apos;est une estimation, pas une économie garantie.</p>
          </Panel>
        </div>
      )}
    </>
  );
}
