# Déploiement — Groupe VGC Inc.

## GitHub
Le projet est hébergé dans le dépôt `lottusservices`, dossier :

`GroupeVGC`

## Netlify
Lors de la création du site depuis GitHub :

- Repository: `AdrianAlbertoMoraSinning/lottusservices`
- Branch: `main`
- Base directory: `GroupeVGC`
- Build command: laisser vide
- Publish directory: `.`
- Functions directory: `netlify/functions`

Le fichier `netlify.toml` inclus est déjà configuré pour fonctionner avec cette base directory.

## Supabase
Projet connecté :

`https://aqzfttzgmtbfijxjlpsx.supabase.co`

Le fichier `supabase-config.js` contient uniquement la clé publique Publishable. La clé secrète Supabase ne doit jamais être placée dans GitHub ni dans le code navigateur.

## Mise à jour GitHub pour cette version
Remplacer dans `GroupeVGC` :
- `netlify.toml`
- `DEPLOY_GITHUB.md`

Si `supabase-config.js` n'a pas encore été remplacé par la version connectée, le remplacer également.


## Mise à jour design réservation v11
Remplacer: `booking.html`, `booking.js`, `style.css`.
