# Kanari : cahier des charges révisé (V1)

Ce document remplace le cahier des charges « EcoGaspi 972 ». Il conserve son objectif et corrige ce que l'étude de marché IdeaCrashTest a fait ressortir : certitude 1/5, facilité 2/5, rapidité 2/5, unicité 2/5.

## 1. Objet

Plateforme web permettant aux cantines scolaires de Martinique de peser leur gaspillage alimentaire, d'en comprendre les causes et de **prouver** l'effet des actions correctives par un pilote mesuré.

Nom : **Kanari**, la marmite en terre des cuisines antillaises. Nom court, ancré localement, prononçable par tous. Une vérification de disponibilité (INPI, nom de domaine) reste à faire avant tout dépôt.

## 2. Ce qui change par rapport à la version initiale

| Point initial | Problème | Décision |
| --- | --- | --- |
| Saisie par plat : préparé, servi, jeté, coût | Plusieurs pesées par plat et par jour : c'est la friction notée 2/5 en facilité | **Deux pesées par service** : restes d'assiette et excédents de cuisine. Production et détail par catégorie deviennent facultatifs |
| Coût saisi à chaque fois | Saisie en plus, chiffre invérifiable | Coût au kilo réglé une fois par établissement, présenté comme une hypothèse |
| Indicateur principal : kilos et % jetés | Varie avec la fréquentation, compare mal deux jours ou deux écoles | **Grammes jetés par repas servi** comme indicateur pivot |
| Pas de protocole de preuve | Certitude 1/5 : « le pilote est une intention, pas une preuve » | **Module Pilotes** : référence, actions, suivi, avec seuils de fiabilité (8 services pesés et 70 % des jours d'école par période) |
| Recommandations génériques | Peu crédibles sans chiffre | Règles explicables qui citent le chiffre déclencheur |
| Création de compte publique (option) | Risque d'accès non maîtrisé | Comptes **sur invitation** uniquement ; un compte non rattaché ne voit rien |
| Sécurité « dès la conception » sans détail | Non vérifiable | RLS PostgreSQL, garde-fous en base, tests automatisés des droits |
| Page d'accueil et page de présentation séparées | Doublon | Une seule page publique |
| Redistribution en V2 mais citée comme preuve dans l'étude | Incohérence | V2 confirmée ; le pilote V1 prouve la réduction, pas les dons |

## 3. Utilisateurs et droits

| Rôle | Lit | Écrit |
| --- | --- | --- |
| Administrateur | Tout | Établissements, comptes, rôles, toutes les pesées |
| Collectivité | Établissements de sa collectivité | Rien |
| Responsable de cantine | Son établissement et son équipe | Pesées (création, correction, suppression), pilotes, fiche de l'établissement (hors rattachement et statut) |
| Personnel de restauration | Son établissement | Pesées ; correction de ses propres saisies pendant 48 h |
| Association partenaire | Réservé V2 | Réservé V2 |

## 4. Fonctionnalités V1

- **Saisie** : date, service, menu (facultatif), repas prévus, repas servis, restes d'assiette (kg), excédents de cuisine (kg). Facultatif : production (kg), détail par catégorie, commentaire. Calcul en direct des grammes par repas. Contrôles : date non future, total jeté inférieur ou égal à la production, détail inférieur ou égal au total, alerte si plus d'1 kg par repas (erreur d'unité probable), un seul enregistrement par service.
- **Tableau de bord** : grammes par repas, kilos jetés, répartition restes / excédents, repas servis, taux de gaspillage (si production pesée), coût estimé, comparaison avec la période précédente, régularité des pesées, recommandations prioritaires, comparaison des établissements (admin, collectivité).
- **Historique** : filtres par dates, recherche, correction, suppression, export CSV.
- **Statistiques** : regroupement jour / semaine / mois, catégories, jours de la semaine, menus les plus gaspillés, établissements, coût.
- **Recommandations** : régularité des pesées, tendance, surproduction, prévision des effectifs, jour atypique, catégorie dominante, menu peu consommé, objectif dépassé.
- **Pilotes** : période de référence, actions testées, période de suivi, objectif de baisse ; résultat en grammes par repas, kilos et coût évités ; avertissement si données insuffisantes ; bilan imprimable.
- **Administration** : établissements (nom, type, adresse, commune, responsable, adresse électronique, repas par jour, coût au kilo, objectif, collectivité, statut), utilisateurs (invitation, rôle, rattachement, désactivation).

## 5. Hors périmètre V1, prévu ensuite

1. Redistribution des surplus aux associations, avec cadre sanitaire défini avec elles (chaîne du froid, traçabilité, responsabilités). Un aliment jeté n'est jamais redistribuable par défaut.
2. Saisie hors connexion.
3. Import depuis les balances existantes.

## 6. Architecture

Next.js 16 (TypeScript), Tailwind CSS 4, Recharts, Supabase (PostgreSQL, authentification), hébergement Vercel, versionnement GitHub. Sans variables Supabase, l'application démarre en mode démonstration.

## 7. Critères de réussite du pilote

À fixer avec la collectivité avant le démarrage : durée des périodes, objectif de baisse (15 % par défaut), hypothèse de coût au kilo, et seuil d'économie qui justifierait l'abonnement.
