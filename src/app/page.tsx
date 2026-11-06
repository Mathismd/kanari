import { ArrowRight, Lock, Scale, ShieldCheck, Smartphone, UserCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const nav = [
  { href: "#methode", label: "La méthode" },
  { href: "#pilote", label: "Le pilote" },
  { href: "#securite", label: "Sécurité" },
];

function ScaleDisplay() {
  // Exemple illustratif, clairement présenté comme tel.
  const plate = 14.2;
  const surplus = 9.6;
  const max = plate + surplus;
  return (
    <figure className="rounded-3xl bg-forest-dark p-7 text-white shadow-[0_30px_60px_-30px_rgba(20,83,45,0.6)] sm:p-9">
      <figcaption className="flex items-center justify-between text-sm text-white/70">
        <span>Mardi, déjeuner</span>
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[12px]">exemple</span>
      </figcaption>
      <p className="figure mt-6 flex items-baseline gap-3 font-bold leading-none">
        <span className="text-[88px] sm:text-[112px]">124</span>
        <span className="text-3xl text-leaf">g</span>
      </p>
      <p className="mt-2 text-white/80">jetés par repas servi, pour 192 repas</p>
      <div className="mt-8 space-y-3 text-sm">
        {[
          ["Restes des assiettes", plate, "bg-white"],
          ["Excédents de cuisine", surplus, "bg-leaf"],
        ].map(([label, kg, color]) => (
          <div key={label as string}>
            <div className="mb-1.5 flex justify-between text-white/80">
              <span>{label}</span>
              <span className="figure font-semibold text-white">{String(kg).replace(".", ",")} kg</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className={`h-2 rounded-full ${color}`} style={{ width: `${((kg as number) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

export default function HomePage() {
  return (
    <div className="bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-7 text-[15px] font-medium text-ink-soft md:flex">
          {nav.map((n) => <a key={n.href} href={n.href} className="hover:text-ink">{n.label}</a>)}
        </nav>
        <Link href="/connexion" className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:bg-mist">
          Se connecter
        </Link>
      </header>

      <main>
        {/* Accroche */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <h1 className="text-[44px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[68px]">
              Combien pèse le gaspillage de votre cantine&nbsp;?
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Kanari aide les cantines scolaires de Martinique à peser leurs restes en deux minutes par service,
              à comprendre d&apos;où ils viennent et à prouver l&apos;effet de chaque action, chiffres à l&apos;appui.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/connexion" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-forest px-5 font-semibold text-white hover:bg-forest-dark">
                Essayer la démonstration <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a href="#pilote" className="inline-flex min-h-12 items-center rounded-lg px-5 font-semibold text-forest hover:bg-leaf-soft/50">
                Voir comment se déroule un pilote
              </a>
            </div>
          </div>
          <ScaleDisplay />
        </section>

        {/* Méthode */}
        <section id="methode" className="border-t border-line bg-mist">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Deux pesées par service, pas une par plat.</h2>
              <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                Peser chaque aliment demande du temps que les équipes n&apos;ont pas. Kanari part du minimum utile, puis laisse
                le détail facultatif pour les jours où l&apos;équipe veut creuser.
              </p>
            </div>
            <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
              {[
                ["Les restes des assiettes", "Le bac de débarrassage, pesé après le repas. Ils parlent des portions, des recettes et du goût des élèves."],
                ["Les excédents de cuisine", "Ce qui a été préparé sans être servi. Ils parlent de la commande et de la prévision des effectifs."],
                ["Les repas servis", "Pour ramener tout en grammes par repas : un chiffre comparable d'un jour, d'une école et d'un mois à l'autre."],
              ].map(([t, d]) => (
                <div key={t} className="bg-paper p-7">
                  <dt className="text-lg font-semibold">{t}</dt>
                  <dd className="mt-2 leading-relaxed text-ink-soft">{d}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-10 grid gap-6 text-[15px] sm:grid-cols-3">
              <li className="flex gap-3"><Smartphone className="mt-0.5 size-5 shrink-0 text-forest" aria-hidden /><span><strong className="font-semibold">Saisie au téléphone</strong>, avec le calcul en direct pour repérer une erreur d&apos;unité.</span></li>
              <li className="flex gap-3"><Scale className="mt-0.5 size-5 shrink-0 text-forest" aria-hidden /><span><strong className="font-semibold">Une balance ordinaire suffit.</strong> Pas d&apos;équipement à acheter pour commencer.</span></li>
              <li className="flex gap-3"><UserCheck className="mt-0.5 size-5 shrink-0 text-forest" aria-hidden /><span><strong className="font-semibold">Des pistes argumentées</strong> : chaque recommandation cite le chiffre qui la justifie.</span></li>
            </ul>
          </div>
        </section>

        {/* Pilote */}
        <section id="pilote" className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Une preuve avant un abonnement.</h2>
              <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                Une collectivité n&apos;a pas à croire Kanari sur parole. Le pilote compare deux périodes dans la même cantine,
                avec le même indicateur, et ne déclare un résultat que si les pesées sont assez nombreuses et régulières.
              </p>
            </div>
            <ol className="space-y-4">
              {[
                ["Référence", "Deux à quatre semaines de pesées sans rien changer. On obtient le point de départ en grammes par repas."],
                ["Actions", "L'équipe choisit une ou deux actions : portions ajustées, pain à la demande, commande calée sur les effectifs de la veille."],
                ["Suivi", "Même durée, mêmes pesées. Kanari calcule la baisse, les kilos évités et leur coût estimé, et signale si les données sont insuffisantes."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-5 rounded-2xl border border-line p-6">
                  <span className="figure text-4xl font-bold leading-none text-leaf">{i + 1}</span>
                  <div>
                    <p className="text-lg font-semibold">{t}</p>
                    <p className="mt-1 leading-relaxed text-ink-soft">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Sécurité */}
        <section id="securite" className="bg-forest-dark text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1.4fr]">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Chacun ne voit que ce qui le concerne.</h2>
            <ul className="grid gap-6 sm:grid-cols-2">
              {[
                [Lock, "Cloisonnement en base", "Les règles d'accès sont appliquées par la base de données elle-même, pas seulement par l'écran."],
                [UserCheck, "Comptes sur invitation", "Pas d'inscription libre. Un nouveau compte ne voit rien tant qu'il n'est pas rattaché."],
                [ShieldCheck, "Aucune donnée d'élève", "Uniquement des effectifs et des pesées, plus les comptes du personnel."],
                [Scale, "Saisies contrôlées", "Dates, quantités et cohérence vérifiées à l'écran puis en base."],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof Lock;
                return (
                  <li key={t as string}>
                    <I className="size-5 text-leaf" aria-hidden />
                    <p className="mt-3 font-semibold">{t as string}</p>
                    <p className="mt-1 leading-relaxed text-white/75">{d as string}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Suite */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-2xl font-bold tracking-tight">Prochaines étapes</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Redistribution des surplus", "Proposer aux associations partenaires les excédents encore consommables, dans un cadre sanitaire défini avec elles : chaîne du froid, traçabilité, responsabilités."],
              ["Saisie hors connexion", "Enregistrer une pesée même quand le réseau est instable en cuisine, puis l'envoyer dès le retour du réseau."],
              ["Balances connectées", "Récupérer automatiquement les pesées des balances déjà présentes, sans double saisie."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-2xl border border-dashed border-line p-6">
                <p className="font-semibold">{t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink-soft">
          <Logo />
          <p>Le kanari, c&apos;est la marmite des cuisines antillaises. Kanari, Martinique.</p>
        </div>
      </footer>
    </div>
  );
}
