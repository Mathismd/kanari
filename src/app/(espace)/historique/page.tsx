"use client";

import { Download, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { Button, EmptyState, Field, Input, PageHeader, Panel, errorMessage, useToast } from "@/components/ui";
import { WasteForm } from "@/components/waste-form";
import { addDays, todayIso } from "@/lib/dates";
import { SERVICE_LABELS, fmtDate, fmtInt, fmtKg } from "@/lib/labels";
import { wasteOf } from "@/lib/metrics";
import { canEditRecord, canManage } from "@/lib/permissions";
import type { WasteRecord } from "@/lib/types";

const PAGE = 25;

/** Échappe une cellule CSV et neutralise l'injection de formules dans les tableurs. */
function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export default function HistoriquePage() {
  const { user, scopedRecords, establishments, establishmentName, store, reload } = useSession();
  const toast = useToast();
  const [from, setFrom] = useState(addDays(todayIso(), -30));
  const [to, setTo] = useState(todayIso());
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<WasteRecord | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr-FR");
    return scopedRecords
      .filter((r) => r.serviceDate >= from && r.serviceDate <= to)
      .filter((r) => !q || (r.menu ?? "").toLocaleLowerCase("fr-FR").includes(q) || (r.comment ?? "").toLocaleLowerCase("fr-FR").includes(q))
      .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate) || a.establishmentId.localeCompare(b.establishmentId));
  }, [scopedRecords, from, to, query]);

  const multi = establishments.length > 1;

  function exportCsv() {
    const header = ["date", "etablissement", "service", "menu", "repas_prevus", "repas_servis", "restes_assiettes_kg", "excedents_kg", "total_jete_kg", "g_par_repas", "production_kg", "commentaire"];
    const lines = rows.map((r) => [
      r.serviceDate, establishmentName(r.establishmentId), SERVICE_LABELS[r.service], r.menu, r.mealsPlanned, r.mealsServed,
      r.plateWasteKg, r.kitchenSurplusKg, wasteOf(r).toFixed(2), r.mealsServed ? Math.round((wasteOf(r) * 1000) / r.mealsServed) : "",
      r.producedKg, r.comment,
    ].map(csvCell).join(";"));
    const blob = new Blob(["﻿" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kanari-pesees-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function remove(r: WasteRecord) {
    if (!window.confirm(`Supprimer la pesée du ${fmtDate(r.serviceDate, { day: "numeric", month: "long" })} ?`)) return;
    try {
      await store.deleteRecord(r.id);
      await reload();
      toast("Pesée supprimée");
    } catch (e) {
      toast(errorMessage(e), "bad");
    }
  }

  if (editing) {
    return (
      <>
        <PageHeader title="Modifier une pesée" description={`${establishmentName(editing.establishmentId)}, ${fmtDate(editing.serviceDate, { weekday: "long", day: "numeric", month: "long" })}`} />
        <WasteForm initial={editing} onDone={() => setEditing(null)} />
      </>
    );
  }

  const visible = rows.slice(0, page * PAGE);

  return (
    <>
      <PageHeader
        title="Historique des pesées"
        description="Chaque ligne est un service pesé. Le personnel peut corriger sa saisie pendant 48 heures ; le responsable à tout moment."
        action={<Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}><Download className="size-4" aria-hidden /> Exporter en CSV</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Field label="Du" htmlFor="from"><Input id="from" type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></Field>
        <Field label="Au" htmlFor="to"><Input id="to" type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></Field>
        <Field label="Rechercher un menu ou un commentaire" htmlFor="q"><Input id="q" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="christophine" /></Field>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune pesée sur cette période">Élargissez les dates ou retirez la recherche.</EmptyState>
      ) : (
        <Panel className="overflow-hidden" title={`${fmtInt(rows.length)} pesée${rows.length > 1 ? "s" : ""}`}>
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-mist/60 text-[13px] text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                  {multi && <th scope="col" className="px-4 py-2.5 font-medium">Établissement</th>}
                  <th scope="col" className="px-4 py-2.5 font-medium">Menu</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Servis</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Jeté</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">g/repas</th>
                  <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => {
                  const est = establishments.find((e) => e.id === r.establishmentId);
                  const editable = canEditRecord(user, r, est);
                  return (
                    <tr key={r.id} className="hover:bg-mist/40">
                      <td className="whitespace-nowrap px-4 py-3">
                        {fmtDate(r.serviceDate, { weekday: "short", day: "numeric", month: "short" })}
                        {r.service !== "dejeuner" && <span className="block text-[12px] text-ink-soft">{SERVICE_LABELS[r.service]}</span>}
                      </td>
                      {multi && <td className="px-4 py-3">{establishmentName(r.establishmentId)}</td>}
                      <td className="max-w-64 px-4 py-3">
                        <span className="line-clamp-1">{r.menu ?? <span className="text-ink-soft">Non renseigné</span>}</span>
                        {r.comment && <span className="line-clamp-1 text-[12px] text-ink-soft">{r.comment}</span>}
                      </td>
                      <td className="figure tabular-nums px-4 py-3 text-right">{fmtInt(r.mealsServed)}</td>
                      <td className="figure tabular-nums whitespace-nowrap px-4 py-3 text-right">{fmtKg(wasteOf(r))}</td>
                      <td className="figure tabular-nums px-4 py-3 text-right font-semibold">{r.mealsServed ? fmtInt((wasteOf(r) * 1000) / r.mealsServed) : "—"}</td>
                      <td className="whitespace-nowrap px-2 py-1 text-right">
                        {editable && (
                          <Button variant="ghost" aria-label={`Modifier la pesée du ${r.serviceDate}`} onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                        )}
                        {canManage(user, r.establishmentId) && (
                          <Button variant="ghost" aria-label={`Supprimer la pesée du ${r.serviceDate}`} onClick={() => void remove(r)}><Trash2 className="size-4" /></Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visible.length < rows.length && (
            <div className="mt-5 text-center">
              <Button variant="secondary" onClick={() => setPage((p) => p + 1)}>Afficher plus</Button>
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
