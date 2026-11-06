import { CATEGORY_LABELS, WEEKDAYS, fmtG, fmtPct } from "./labels";
import { addDays, schoolDays } from "./dates";
import { byCategory, byWeekday, change, completeness, inRange, menuRanking, summarize, type CostLookup } from "./metrics";
import type { Establishment, WasteRecord } from "./types";

export type RecoLevel = "alerte" | "conseil" | "positif";

export interface Recommendation {
  id: string;
  level: RecoLevel;
  title: string;
  detail: string;
  action: string;
}

/**
 * Règles statistiques simples et explicables. Chaque recommandation cite le chiffre qui la déclenche,
 * pour qu'un responsable puisse la vérifier lui-même.
 */
export function recommend(
  allRecords: WasteRecord[],
  establishments: Establishment[],
  today: string,
  costOf: CostLookup,
): Recommendation[] {
  const out: Recommendation[] = [];
  const from = addDays(today, -56); // 8 semaines
  const records = inRange(allRecords, from, today);
  const estIds = establishments.filter((e) => e.active).map((e) => e.id);

  if (records.length === 0) {
    return [{
      id: "start",
      level: "conseil",
      title: "Commencez par deux semaines de pesées",
      detail: "Aucune pesée sur les 8 dernières semaines. Les recommandations apparaissent dès que les données suffisent.",
      action: "Pesez les restes des assiettes et les excédents de cuisine à chaque déjeuner pendant 10 jours d'école.",
    }];
  }

  const s = summarize(records, costOf);
  const overall = s.gPerMeal ?? 0;

  // 1. Régularité des pesées : sans elle, aucune comparaison n'est fiable.
  const recentDays = schoolDays(addDays(today, -27), today);
  const comp = completeness(allRecords, estIds, recentDays[0] ?? today, today);
  if (comp !== null && comp < 80) {
    out.push({
      id: "completeness",
      level: "alerte",
      title: "Des jours de pesée manquent",
      detail: `Seuls ${fmtPct(comp)} des jours d'école des 4 dernières semaines ont une pesée.`,
      action: "Désignez une personne par service pour la pesée et gardez la balance près du point de tri.",
    });
  }

  // 2. Tendance : 10 derniers jours d'école contre les 10 précédents.
  const last = inRange(records, addDays(today, -13), today);
  const prev = inRange(records, addDays(today, -27), addDays(today, -14));
  const delta = change(summarize(last, costOf).gPerMeal, summarize(prev, costOf).gPerMeal);
  if (delta !== null && last.length >= 4 && prev.length >= 4) {
    if (delta >= 10) {
      out.push({
        id: "trend-up",
        level: "alerte",
        title: "Le gaspillage augmente",
        detail: `+${fmtPct(delta)} de grammes jetés par repas sur les deux dernières semaines.`,
        action: "Repérez dans l'historique les menus ou les jours qui expliquent la hausse.",
      });
    } else if (delta <= -10) {
      out.push({
        id: "trend-down",
        level: "positif",
        title: "Le gaspillage baisse",
        detail: `${fmtPct(delta)} de grammes jetés par repas sur les deux dernières semaines.`,
        action: "Notez ce qui a changé pour le reproduire et le partager avec les autres sites.",
      });
    }
  }

  // 3. Surproduction : la part non servie pèse plus que les restes d'assiette.
  if (s.wasteKg > 0 && s.surplusKg / s.wasteKg >= 0.4) {
    out.push({
      id: "surplus",
      level: "alerte",
      title: "Une grande partie des pertes n'a jamais été servie",
      detail: `${fmtPct((s.surplusKg / s.wasteKg) * 100)} des pertes sont des excédents de cuisine, pas des restes d'assiette.`,
      action: "Ajustez la production aux effectifs confirmés la veille plutôt qu'aux effectifs théoriques.",
    });
  }

  // 4. Prévision des effectifs.
  if (s.forecastGap !== null && s.forecastGap >= 8) {
    out.push({
      id: "forecast",
      level: "conseil",
      title: "Les effectifs prévus sont surestimés",
      detail: `En moyenne, ${fmtPct(s.forecastGap)} des repas prévus ne sont pas servis.`,
      action: "Faites remonter les absences connues (sorties, examens, grèves) avant la commande.",
    });
  }

  // 5. Jour de la semaine qui se démarque.
  const days = byWeekday(records).filter((d) => d.services >= 3 && d.gPerMeal !== null);
  const worst = days.sort((a, b) => (b.gPerMeal ?? 0) - (a.gPerMeal ?? 0))[0];
  if (worst && overall > 0 && (worst.gPerMeal ?? 0) >= overall * 1.2) {
    out.push({
      id: "weekday",
      level: "conseil",
      title: `Le ${WEEKDAYS[worst.dow]} se démarque`,
      detail: `${fmtG(worst.gPerMeal ?? 0)} jetés par repas le ${WEEKDAYS[worst.dow]}, contre ${fmtG(overall)} en moyenne.`,
      action: `Vérifiez les menus servis ce jour-là et la fréquentation réelle du ${WEEKDAYS[worst.dow]}.`,
    });
  }

  // 6. Catégorie dominante (si le détail est renseigné).
  const cats = byCategory(records);
  if (cats[0] && cats[0].share >= 30) {
    out.push({
      id: "category",
      level: "conseil",
      title: `${CATEGORY_LABELS[cats[0].category]} : la première source de pertes`,
      detail: `${fmtPct(cats[0].share)} des pertes détaillées.`,
      action: "Testez une portion réduite avec possibilité de se resservir, ou une autre recette.",
    });
  }

  // 7. Menu le plus gaspillé (au moins deux services pour éviter un cas isolé).
  const menu = menuRanking(records).find((m) => m.services >= 2);
  if (menu && overall > 0 && menu.gPerMeal >= overall * 1.4) {
    out.push({
      id: "menu",
      level: "conseil",
      title: `« ${menu.menu} » est peu consommé`,
      detail: `${fmtG(menu.gPerMeal)} jetés par repas sur ${menu.services} services, contre ${fmtG(overall)} en moyenne.`,
      action: "Demandez l'avis des élèves et du personnel de service avant de le reprogrammer.",
    });
  }

  // 8. Objectif par établissement.
  for (const e of establishments) {
    if (!e.targetGPerMeal) continue;
    const es = summarize(records.filter((r) => r.establishmentId === e.id), costOf);
    if (es.gPerMeal !== null && es.services >= 5 && es.gPerMeal > e.targetGPerMeal) {
      out.push({
        id: `target-${e.id}`,
        level: "conseil",
        title: `${e.name} au-dessus de son objectif`,
        detail: `${fmtG(es.gPerMeal)} par repas pour un objectif de ${fmtG(e.targetGPerMeal)}.`,
        action: "Lancez un pilote avec une action ciblée pour mesurer son effet.",
      });
    }
  }

  const order: Record<RecoLevel, number> = { alerte: 0, conseil: 1, positif: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
