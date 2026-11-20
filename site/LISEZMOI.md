# Nouveau site EPIC-NON : notes de mise en ligne

Site statique : HTML, CSS, quelques scripts et des fichiers de données. Pas de compilation, pas de base de données, **aucune requête vers un service externe** (polices, scripts et médias sont tous dans le dossier).

## Pages

| Page | Rôle |
| --- | --- |
| `index.html` | Accueil : le vote, les chiffres, le schéma des données, les publics, comment signer, comment aider, le comité |
| `comprendre.html` | Les 16 points, filtrables par public, chacun avec sa comparaison et ses sources |
| `faq.html` | FAQ du comité (remplace l'actuelle, même adresse) |
| `partager.html` | Matériel à partager : flyers à imprimer, stories vidéo, carrousels, feuilles de signatures |

## Dossiers et fichiers

| Chemin | Contenu |
| --- | --- |
| `style.css`, `css/` | Styles (clair et sombre). `css/fonts.css` déclare les polices locales |
| `site.js`, `js/` | Jours restants, compteur, bibliothèque, en-tête, page Partager |
| `fonts/` | IBM Plex Sans et IBM Plex Sans Condensed (licence SIL OFL, `fonts/OFL.txt`) |
| `data/points.json`, `data/tokens.json` | La bibliothèque (points, publics, carrousels) et les couleurs, partagées avec les flyers |
| `partager/` | Flyers PDF, stories MP4, carrousels PNG et zip, `manifest.json` (généré, ne pas éditer à la main) |
| `images/comite/`, `images/logos/` | Photos du comité, logos des soutiens |
| `compteur.json` | Total de signatures affiché par le compteur |

## Mise en ligne

1. Copier tout le contenu de ce dossier à la racine de epic-non.ch.
2. **Ne rien supprimer dans `files/`** : les feuilles de signatures A4/A5 restent servies depuis `https://epic-non.ch/files/…`.
3. Rediriger l'ancienne page des carrousels vers la nouvelle (`carrousels.html` → `partager.html#carrousels`), de préférence par une redirection 301 côté serveur.
4. Réglages du serveur :
   - **Vidéos** : le serveur doit accepter les requêtes partielles (`Accept-Ranges: bytes`), sinon les stories ne se lisent pas sur iPhone. C'est le cas par défaut sur Apache, Nginx et la plupart des hébergeurs.
   - Types : `.mp4` → `video/mp4`, `.json` → `application/json`, `.woff2` → `font/woff2`.
   - `compteur.json` : pas de cache long (quelques minutes au plus).
5. Plus aucun passage « à confirmer » (`class="tbc"`) dans les pages : tout a été validé par le comité.

## Mettre à jour le compteur (chaque soir)

Modifier uniquement `compteur.json` :

```json
{
  "recues": 4210,
  "objectif": 12000,
  "maj": "2026-11-24T18:00:00+01:00"
}
```

Le compteur reste masqué tant que `recues` est inférieur à 6 000. Pour changer ce seuil, ajouter `"afficherDes": 5000` (par exemple) dans `compteur.json`.

## Liens utiles

- Par public, pour les publicités, les messages et les QR codes : `comprendre.html#pour=secret` (ou `soignant`, `suisse`, `argent`, `egalite`, `ia`, `technique`, `region`), `partager.html#pour=…`.
- Les QR codes des flyers ouvrent `https://epic-non.ch/?s=<public>#signer` : l'accueil se cale sur ce public et arrive sur « Comment signer ». Aucune mesure d'audience n'est faite ; les journaux normaux du serveur suffisent pour voir quels flyers amènent des visites.

## Modifier le contenu

- Les textes des points, des publics et des carrousels sont dans `data/points.json`. Les flyers, stories et carrousels se régénèrent avec les outils du dossier `systeme/` (voir `systeme/LISEZMOI-systeme.md`), qui recopient ensuite les fichiers ici.
- Date limite : constante `DEADLINE` en haut de `site.js` et de `js/a-header.js`.

## Vie privée

Le pied de page dit que le site n'utilise ni cookies publicitaires ni outil de mesure d'audience. C'est vrai tant que rien d'externe n'est ajouté. Si un outil de statistiques devient nécessaire, choisir une configuration sans cookie hébergée en Suisse, et jamais de pixel Meta.
