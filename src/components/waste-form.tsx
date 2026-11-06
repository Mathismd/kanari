"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { todayIso } from "@/lib/dates";
import { CATEGORIES, CATEGORY_LABELS, SERVICE_LABELS, fmtEur, fmtInt, fmtKg } from "@/lib/labels";
import { canWrite } from "@/lib/permissions";
import type { Category, ServiceType, WasteRecord } from "@/lib/types";
import { firstErrors, parseNumber, wasteRecordSchema } from "@/lib/validation";
import { Readout } from "./readout";
import { useSession } from "./session";
import { Button, Field, Input, Select, Textarea, errorMessage, useToast } from "./ui";

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));

export function WasteForm({ initial, onDone }: { initial?: WasteRecord; onDone?: () => void }) {
  const { user, establishments, records, store, reload } = useSession();
  const toast = useToast();
  const writable = establishments.filter((e) => canWrite(user, e) || (initial && e.id === initial.establishmentId));
  const today = todayIso();

  const [establishmentId, setEstablishmentId] = useState(initial?.establishmentId ?? writable[0]?.id ?? "");
  const est = establishments.find((e) => e.id === establishmentId);
  const [serviceDate, setServiceDate] = useState(initial?.serviceDate ?? today);
  const [service, setService] = useState<ServiceType>(initial?.service ?? "dejeuner");
  const [mealsPlanned, setMealsPlanned] = useState(str(initial?.mealsPlanned ?? est?.dailyMeals ?? null));
  const [mealsServed, setMealsServed] = useState(str(initial?.mealsServed));
  const [plate, setPlate] = useState(str(initial?.plateWasteKg));
  const [surplus, setSurplus] = useState(str(initial?.kitchenSurplusKg));
  const [produced, setProduced] = useState(str(initial?.producedKg));
  const [menu, setMenu] = useState(initial?.menu ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [details, setDetails] = useState<{ category: Category; kg: string }[]>(
    initial?.details.map((d) => ({ category: d.category, kg: str(d.kg) })) ?? [],
  );
  const [more, setMore] = useState(Boolean(initial?.producedKg || initial?.details.length || initial?.comment));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const pastMenus = useMemo(
    () => [...new Set(records.filter((r) => r.establishmentId === establishmentId && r.menu).map((r) => r.menu as string))].slice(0, 50),
    [records, establishmentId],
  );

  const served = parseNumber(mealsServed);
  const total = (parseNumber(plate) || 0) + (parseNumber(surplus) || 0);
  const live = served && served > 0 && Number.isFinite(total) ? Math.round((total * 1000) / served) : null;

  if (writable.length === 0) {
    return <p className="text-ink-soft">Votre rôle ne permet pas de saisir des pesées.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      establishmentId,
      serviceDate,
      service,
      mealsPlanned: parseNumber(mealsPlanned) ?? NaN,
      mealsServed: parseNumber(mealsServed) ?? NaN,
      plateWasteKg: parseNumber(plate) ?? 0,
      kitchenSurplusKg: parseNumber(surplus) ?? 0,
      producedKg: parseNumber(produced),
      menu,
      comment,
      details: details.filter((d) => d.kg.trim() !== "").map((d) => ({ category: d.category, kg: parseNumber(d.kg) ?? NaN })),
    };
    const parsed = wasteRecordSchema(today).safeParse(input);
    if (!parsed.success) {
      const errs = firstErrors(parsed.error);
      setErrors(errs);
      if (errs.producedKg || errs.details || errs.comment) setMore(true);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await store.saveRecord(parsed.data, initial?.id);
      await reload();
      toast(initial ? "Pesée modifiée" : `Pesée enregistrée : ${fmtKg(parsed.data.plateWasteKg + parsed.data.kitchenSurplusKg)} jetés`);
      if (!initial) {
        setMealsServed("");
        setPlate("");
        setSurplus("");
        setProduced("");
        setMenu("");
        setComment("");
        setDetails([]);
      }
      onDone?.();
    } catch (err) {
      toast(errorMessage(err), "bad");
    } finally {
      setBusy(false);
    }
  }

  const num = { inputMode: "decimal" as const, autoComplete: "off" };
  const invalid = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

  return (
    <form onSubmit={submit} onChange={() => { if (Object.keys(errors).length) setErrors({}); }} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="order-2 space-y-6 lg:order-1">
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="sr-only">Service</legend>
          {writable.length > 1 && (
            <Field label="Établissement" htmlFor="establishmentId" error={errors.establishmentId} className="sm:col-span-3">
              <Select id="establishmentId" value={establishmentId} disabled={!!initial} onChange={(e) => setEstablishmentId(e.target.value)}>
                {writable.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Date" htmlFor="serviceDate" error={errors.serviceDate}>
            <Input id="serviceDate" type="date" max={today} value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} {...invalid("serviceDate")} />
          </Field>
          <Field label="Service" htmlFor="service">
            <Select id="service" value={service} onChange={(e) => setService(e.target.value as ServiceType)}>
              {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Menu du jour" htmlFor="menu" error={errors.menu} hint="Facultatif, utile pour repérer les plats peu consommés.">
            <Input id="menu" list="menus" value={menu} maxLength={200} onChange={(e) => setMenu(e.target.value)} placeholder="Colombo de poulet, riz" />
            <datalist id="menus">{pastMenus.map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-[15px] font-semibold">Effectifs</legend>
          <Field label="Repas prévus" htmlFor="mealsPlanned" error={errors.mealsPlanned}>
            <Input id="mealsPlanned" inputMode="numeric" value={mealsPlanned} onChange={(e) => setMealsPlanned(e.target.value)} {...invalid("mealsPlanned")} />
          </Field>
          <Field label="Repas servis" htmlFor="mealsServed" error={errors.mealsServed}>
            <Input id="mealsServed" inputMode="numeric" value={mealsServed} onChange={(e) => setMealsServed(e.target.value)} {...invalid("mealsServed")} autoFocus={!initial} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-[15px] font-semibold">Pesées, en kilos</legend>
          <Field label="Restes des assiettes" htmlFor="plate" error={errors.plateWasteKg} hint="Le bac de débarrassage, après le repas.">
            <Input id="plate" {...num} value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="0,0" {...invalid("plateWasteKg")} />
          </Field>
          <Field label="Excédents de cuisine" htmlFor="surplus" error={errors.kitchenSurplusKg} hint="Préparé mais jamais servi.">
            <Input id="surplus" {...num} value={surplus} onChange={(e) => setSurplus(e.target.value)} placeholder="0,0" {...invalid("kitchenSurplusKg")} />
          </Field>
        </fieldset>

        <div className="rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            className="flex min-h-12 w-full items-center justify-between px-4 text-left text-[15px] font-semibold"
          >
            Détails facultatifs : production, catégories, commentaire
            <ChevronDown className={`size-5 transition-transform ${more ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {more && (
            <div className="space-y-5 border-t border-line p-4">
              <Field label="Quantité produite (kg)" htmlFor="produced" error={errors.producedKg} hint="Permet de calculer le taux de gaspillage.">
                <Input id="produced" {...num} value={produced} onChange={(e) => setProduced(e.target.value)} className="sm:max-w-48" {...invalid("producedKg")} />
              </Field>

              <div>
                <p className="mb-1.5 text-sm font-medium">Répartition par catégorie</p>
                {errors.details && <p className="mb-2 text-sm text-danger" role="alert">{errors.details}</p>}
                <div className="space-y-2">
                  {details.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <Select aria-label="Catégorie" value={d.category} onChange={(e) => setDetails((all) => all.map((x, j) => (j === i ? { ...x, category: e.target.value as Category } : x)))}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                      </Select>
                      <Input aria-label="Kilos" {...num} value={d.kg} placeholder="kg" className="w-24 shrink-0" onChange={(e) => setDetails((all) => all.map((x, j) => (j === i ? { ...x, kg: e.target.value } : x)))} />
                      <Button type="button" variant="ghost" aria-label="Retirer la ligne" onClick={() => setDetails((all) => all.filter((_, j) => j !== i))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {details.length < 9 && (
                  <Button type="button" variant="secondary" className="mt-2" onClick={() => setDetails((all) => [...all, { category: CATEGORIES.find((c) => !all.some((x) => x.category === c)) ?? "autre", kg: "" }])}>
                    <Plus className="size-4" aria-hidden /> Ajouter une catégorie
                  </Button>
                )}
              </div>

              <Field label="Commentaire" htmlFor="comment" error={errors.comment}>
                <Textarea id="comment" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Sortie scolaire, plat remplacé, panne…" />
              </Field>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy} className="min-w-48">
            {busy ? "Enregistrement…" : initial ? "Enregistrer les modifications" : "Enregistrer la pesée"}
          </Button>
          {onDone && initial && (
            <Button type="button" variant="secondary" onClick={onDone}>Annuler</Button>
          )}
        </div>
      </div>

      <aside className="order-1 lg:order-2">
        <div className="lg:sticky lg:top-6">
          <Readout
            size="md"
            caption="Ce service, par repas servi"
            value={live === null ? "—" : fmtInt(live)}
            footer={
              <p>
                {Number.isFinite(total) && total > 0 ? `${fmtKg(total)} jetés, soit environ ${fmtEur(total * (est?.costPerKg ?? 5))}` : "Saisissez les repas servis et les pesées."}
                {est?.targetGPerMeal && live !== null ? <><br />Objectif de l&apos;établissement : {est.targetGPerMeal} g</> : null}
              </p>
            }
          />
        </div>
      </aside>
    </form>
  );
}
