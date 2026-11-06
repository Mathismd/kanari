# Kanari

Peser, comprendre et réduire le gaspillage alimentaire dans les cantines scolaires de Martinique.

*Le kanari est la marmite en terre des cuisines antillaises.*

Kanari remplace le projet « EcoGaspi 972 ». Les choix qui diffèrent du cahier des charges initial sont expliqués dans [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md).

## Ce que fait la première version

| Page | Rôle |
| --- | --- |
| Accueil | Présentation, méthode, déroulé d'un pilote, sécurité, feuille de route |
| Connexion | Comptes sur invitation (mode réel) ou choix d'un profil (mode démo) |
| Tableau de bord | Grammes jetés par repas, kilos, restes / excédents, taux, coût estimé, comparaison avec la période précédente |
| Saisir une pesée | Deux pesées par service, calcul en direct, contrôles de cohérence, détail facultatif |
| Historique | Filtres, recherche, correction (48 h pour le personnel), suppression (responsable), export CSV |
| Statistiques | Jour / semaine / mois, catégories, jours de la semaine, menus, établissements, coût |
| Recommandations | Règles statistiques explicables, chaque piste cite son chiffre |
| Pilotes avant / après | Période de référence, actions, suivi, résultat jugé fiable ou non, bilan imprimable |
| Établissements, Utilisateurs, Paramètres | Gestion des sites, des rôles, du compte |

Rôles : administrateur, collectivité (lecture de ses établissements), responsable de cantine, personnel de restauration. Le rôle « association partenaire » est réservé à la V2 (redistribution).

## Lancer en local

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000. Sans configuration, l'application tourne en **mode démo** : 13 semaines de données fictives pour trois établissements, quatre profils à essayer, tout est stocké dans le navigateur.

## Mettre en ligne ce soir (mode démo)

1. Créer un dépôt GitHub et y pousser ce dossier :
   ```bash
   git remote add origin https://github.com/<compte>/kanari.git
   git push -u origin main
   ```
2. Sur vercel.com : *Add New > Project*, importer le dépôt, cliquer *Deploy*. Aucune variable à renseigner.

## Passer en mode réel (Supabase)

1. Créer un projet sur supabase.com.
2. *SQL Editor* : exécuter `supabase/migrations/0001_schema.sql`, puis `supabase/seed.sql` (établissements d'exemple, facultatif).
3. *Authentication > Sign In / Providers* : désactiver l'inscription libre (*Allow new users to sign up*).
4. *Authentication > URL Configuration* : *Site URL* = l'adresse Vercel.
5. Créer votre compte dans *Authentication > Users*, puis vous nommer administrateur :
   ```sql
   update public.profiles set role = 'admin', full_name = 'Votre nom'
   where id = (select id from auth.users where email = 'votre.adresse@exemple.fr');
   ```
6. Dans Vercel, *Settings > Environment Variables* : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (voir `.env.example`), puis redéployer.

Les autres comptes se créent ensuite depuis la page *Utilisateurs* (invitation par courriel).

## Sécurité

- **Row Level Security sur toutes les tables.** Les droits sont appliqués par PostgreSQL : un appel direct à l'API avec la clé publique ne contourne rien.
- **Moindre privilège.** Pas d'inscription libre ; un compte invité ou créé sans rattachement ne voit aucune donnée. Le rôle n'est jamais lu dans les métadonnées envoyées par le client.
- **Garde-fous en base.** Un utilisateur ne peut ni s'attribuer un rôle, ni changer d'établissement, ni modifier l'auteur d'une pesée ; un établissement désactivé n'accepte plus de saisie.
- **Validation double.** Zod côté écran, contraintes `CHECK` et déclencheurs côté base (date future, total jeté supérieur à la production, détail incohérent, catégorie inconnue).
- **Clé service_role confinée** à la route serveur d'invitation, qui vérifie le jeton et le rôle admin de l'appelant.
- **En-têtes HTTP** : CSP restrictive, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Export CSV** protégé contre l'injection de formules.
- **Aucune donnée d'élève** : seulement des effectifs, des pesées et les comptes du personnel.

## Tests

```bash
npm test            # 21 tests : indicateurs, pilote, validation, recommandations, droits en mode démo
npm run test:db     # 21 vérifications RLS sur un PostgreSQL local (voir ci-dessous)
```

`test:db` charge `supabase/tests/auth_stub.sql` (simulation du schéma `auth` de Supabase), la migration, puis `supabase/tests/rls_test.sql`. Il attend une base vide accessible via `psql` (variables `PG*` habituelles).

## Structure

```
src/app/page.tsx                 accueil public
src/app/connexion/               connexion
src/app/(espace)/…               pages de l'application (une par dossier)
src/app/api/invitations/         invitation des comptes (serveur)
src/components/                  interface, graphiques, formulaire de saisie, session
src/lib/metrics.ts               indicateurs et calcul des pilotes
src/lib/recommendations.ts       règles de recommandation
src/lib/validation.ts            validation des saisies
src/lib/permissions.ts           règles d'accès (miroir des politiques SQL)
src/lib/store/                   accès aux données : démo (navigateur) ou Supabase
supabase/                        schéma, données d'exemple, tests RLS
```

## Limites connues de la V1

- La réinitialisation du mot de passe passe par l'administrateur (nouvelle invitation).
- La CSP autorise les scripts en ligne générés par Next.js ; une CSP à nonce est prévue.
- Les statistiques sont calculées dans le navigateur ; au-delà de quelques milliers de pesées par utilisateur, il faudra des vues agrégées côté base.
- Le coût au kilo est une hypothèse réglable par établissement, pas une donnée mesurée.
