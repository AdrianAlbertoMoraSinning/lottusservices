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
