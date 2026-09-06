# Groupe VGC Inc. — Portail Web (Québec)

Version initiale consolidée du portail Groupe VGC Inc., avec une base de données Supabase indépendante.

## Identité confirmée
- Groupe VGC Inc.
- Slogan : « La qualité par l’efficacité »
- Téléphone : 438-866-2383
- Courriel : mtltransport360@gmail.com
- Zone : Montréal et les environs
- Disponibilité annoncée : 24/7
- Positionnement : logistique et entretien

## IMPORTANT avant mise en production
1. Projet Supabase Groupe VGC créé.
2. Exécuter `supabase/schema.sql`.
3. `supabase-config.js` est déjà configuré avec l’URL et la clé publique Publishable du projet Groupe VGC.
4. Ne jamais réutiliser les identifiants Supabase de RB Moving.
5. Configurer le domaine final dans Netlify lorsque le client le fournira.
6. Stripe est conservé comme architecture optionnelle, mais ne doit pas être activé avant configuration du compte VGC.

## Favicon / PWA
Tous les fichiers sont déjà inclus dans `/assets` et référencés dans les pages publiques : favicon.ico, 16x16, 32x32, 48x48, Apple Touch Icon, Android 192/512 et `site.webmanifest`.

## Tarifs
Aucun tarif commercial n’a été inventé. Les services sont affichés « Sur devis ». Le schéma accepte initialement des prix à 0; l’administrateur pourra saisir les tarifs réels lorsqu’ils seront confirmés.

## V12 — Portail multilingue
Le portail prend en charge trois langues sur l’ensemble de l’interface actuelle :
- Français (FR) — langue par défaut
- English (EN)
- Español (ES)

Le sélecteur de langue est affiché dans l’en-tête. Le choix est mémorisé dans le navigateur (`localStorage`) et reste actif pendant la navigation entre les pages. Les valeurs techniques utilisées par Supabase (statuts, formulaires et facturation) restent stables indépendamment de la langue affichée.

Le moteur multilingue est centralisé dans `i18n.js`. Les services standards actuels sont également traduits. Les contenus libres saisis ultérieurement par un administrateur ou provenant de tiers (par exemple un nouvel avis ou un nouveau service personnalisé) restent dans la langue dans laquelle ils ont été saisis, sauf si une traduction correspondante est ajoutée au moteur.


## V12.1 deployment note
Language selector path corrected for the `/groupevgc/` subdirectory deployment.
