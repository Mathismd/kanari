"use client";

import { AlertTriangle, Lightbulb, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { useSession } from "@/components/session";
import { PageHeader, cx } from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { recommend, type RecoLevel } from "@/lib/recommendations";

const STYLE: Record<RecoLevel, { label: string; icon: typeof Lightbulb; bar: string; text: string }> = {
  alerte: { label: "Alerte", icon: AlertTriangle, bar: "bg-signal", text: "text-signal" },
  conseil: { label: "Conseil", icon: Lightbulb, bar: "bg-forest", text: "text-forest" },
  positif: { label: "Progrès", icon: TrendingDown, bar: "bg-leaf", text: "text-forest" },
};

export default function RecommandationsPage() {
  const { scopedRecords, scopedEstablishments, costOf } = useSession();
  const recos = useMemo(() => recommend(scopedRecords, scopedEstablishments, todayIso(), costOf), [scopedRecords, scopedEstablishments, costOf]);

  return (
    <>
      <PageHeader
        title="Recommandations"
        description="Calculées sur les 8 dernières semaines à partir de règles simples. Chaque piste cite le chiffre qui la justifie : vérifiez-la avec l'équipe avant d'agir."
      />
      <ol className="space-y-3">
        {recos.map((r) => {
          const st = STYLE[r.level];
          const Icon = st.icon;
          return (
            <li key={r.id} className="relative overflow-hidden rounded-xl border border-line bg-paper py-5 pl-6 pr-5">
              <span aria-hidden className={cx("absolute inset-y-0 left-0 w-1.5", st.bar)} />
              <p className={cx("flex items-center gap-1.5 text-[13px] font-semibold", st.text)}>
                <Icon className="size-4" aria-hidden /> {st.label}
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-snug">{r.title}</h2>
              <p className="mt-1 text-ink-soft">{r.detail}</p>
              <p className="mt-3 border-t border-line pt-3 text-[15px]">
                <span className="font-semibold">Piste : </span>
                {r.action}
              </p>
            </li>
          );
        })}
      </ol>
    </>
  );
}
