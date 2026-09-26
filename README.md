# Carte du Ciel

Ouverture de pochettes de planches célestes en 3D. On déchire la pochette du doigt ou à la souris, on découvre cinq planches une à une, et la plus rare a droit à sa propre séquence : le ciel pivote vers sa constellation, un réticule l'accroche, sa distance défile, puis elle surgit.

Série I : 32 planches, 5 raretés (Commune, Rare, Épique, Légendaire, Mythique) et 5 finitions (Gravure, Argentique, Spectrale, Dorée, Singularité). La collection se consulte dans l'**Atlas céleste** : chaque planche obtenue s'allume à sa vraie position dans le ciel, et les constellations se tracent à mesure qu'on les complète. Tout est procédural : illustrations en shaders GLSL, textures dessinées au canvas, sons synthétisés en WebAudio. Aucune image ni aucun son externe.

## Démarrer

Node 20.19 ou plus récent (22 recommandé, voir `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173
```

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement, rechargement à chaud (shaders compris) |
| `npm run build` | vérification des types puis build de production dans `dist/` |
| `npm run preview` | sert le build de production sur http://localhost:4173 |
| `npm run typecheck` | TypeScript sans compilation |
| `npm test` | tests unitaires (Vitest) |
| `npm run test:visual` | parcours complet dans Chromium, comparé aux images de référence |
| `npm run test:visual:update` | régénère les images de référence |
| `npm run render:plates` | rend les 32 planches en WebP dans `public/plates/` (après `npm run build`) |
| `npm run make:icons` | génère les icônes de l'application dans `public/icons/` |

Adresses :

- `/` : la pochette ; `/atlas` : l'Atlas céleste ; `/planche/12` : la planche 12 (lien partageable) ;
- `/#epique`, `/#legendaire`, `/#mythique` : forcent la rareté de la dernière planche ;
- `?q=low`, `?q=medium`, `?q=high` : imposent un niveau de qualité ;
- `?fallback` : affiche la page de repli sans WebGL ;
- `?noworker` : dessine les planches sur le fil principal ;
- `?plate=12` : rend la planche 12 seule (utilisé par `render:plates`) ;
- `?nosw` : n'enregistre pas le service worker.

## Organisation

```
src/
├─ main.ts         entrée : vérifie WebGL 2, charge l'application ou la page de repli, service worker
├─ app.ts          application 3D : saisie (pointeur, clavier, gyroscope), boucle, démarrage
├─ fallback.ts     page de repli sans WebGL (planches en images)
├─ core/           outils (tweens, easings, ressorts), aléatoire pur, pointeur, gyroscope, adresses
├─ astro/          éphémérides : positions du Soleil, de la Lune, des planètes et des comètes
├─ atlas/          Atlas céleste (repères, constellations, navigation) et Album
├─ data/           catalogue de la Série I, tirage, économie (poussière d'étoiles, récompenses)
├─ flow/           déroulé d'une ouverture, enchaînements de l'Atlas, machine d'états
├─ render/         renderer, bloom et composition, ciel, constellations, caméra, particules, niveaux de qualité
├─ cards/          planche 3D, dessin des faces au canvas, Worker de dessin
├─ pack/           pochette et mécanique de déchirure
├─ audio/          sons synthétisés
├─ ui/             interface HTML par-dessus la scène, panneau de réglages
├─ store/          collection (IndexedDB), réglages, stockage local
├─ shaders/        GLSL, un fichier par shader, importés en texte brut (?raw)
├─ styles/         CSS
└─ assets/fonts/   Bodoni Moda et Martian Mono auto-hébergées (SIL OFL)
public/
├─ plates/         images des 32 planches (page de repli, bientôt aperçus de partage)
├─ icons/          icônes de l'application installée
└─ manifest.webmanifest
scripts/           rendu des planches, génération des icônes
tools/sw-plugin.ts plugin Vite qui écrit le service worker
tests/
├─ unit/           tirages, catalogue, machine d'états, tweens, collection, qualité
└─ visual/         parcours Playwright et images de référence
```

### Machine d'états

`src/flow/machine.ts` déclare les états de l'enchaînement et les transitions permises :

```
loading → idle → tearing → opening → reveal → walkout → hero → transition → summary ⇄ inspect
                                                                              summary → transition → idle
idle, summary → atlas ⇄ atlasPlate          atlas → transition → idle
loading → atlas, atlasPlate                 (adresses /atlas et /planche/N)
```

Tout changement d'état passe par `go()` (`src/flow/flow.ts`). Une transition absente de la table lève une erreur en développement et un avertissement en production : les courses entre animations deviennent visibles au lieu de produire un écran incohérent.

### Temps du jeu

Toutes les animations suivent `Clock.t` (et non l'horloge du navigateur). `nextFrame()` attend la prochaine image du jeu. C'est ce qui rend les tests visuels reproductibles : ils pilotent le temps image par image avec `CDC.advance()`.

### Atlas céleste

`src/atlas/atlas.ts` place un repère par planche sur la sphère céleste du fond, aux coordonnées réelles (ascension droite, déclinaison). Les objets du Système solaire (Lune, planètes, Cérès, comètes de Halley et Hale-Bopp) sont placés à leur position du jour, calculée par `src/astro/ephemeris.ts` à partir d'éléments orbitaux moyens (précision de l'ordre du degré, vérifiée par des tests : Soleil au 1er janvier 2000, équinoxe, grande conjonction de 2020, Hale-Bopp en 1997). L'écliptique est tracée en pointillés.

On fait tourner le ciel au doigt ou à la souris (avec inertie), on zoome à la molette ou en pinçant ; le nord se remet doucement en haut. Chaque repère est un vrai bouton HTML, utilisable au clavier. Toucher une planche fait pivoter le ciel vers elle et la fait apparaître en 3D avec sa fiche ; pour les objets du Système solaire, la fiche donne leur position du jour.

### Album, poussière d'étoiles et récompenses

L'Album (onglet de l'Atlas) montre les 32 planches : image pour celles qu'on possède (`public/plates/`), silhouette pour les autres. Les doublons se convertissent en poussière d'étoiles (5 à 250 selon la rareté) ; la poussière crée une planche manquante (40 à 2 000). La première pochette de chaque jour rapporte 25 poussières, et chaque constellation complétée 40 par planche. Tout est calculé par des fonctions pures dans `src/data/economy.ts`, testées.

### Qualité graphique

`src/render/quality.ts` classe l'appareil en trois niveaux (Économie, Standard, Maximale) d'après le GPU, la mémoire et l'écran. Chaque niveau fixe le plafond de pixels, l'anticrénelage, la profondeur du bloom, la part de particules et la taille des textures. La résolution dynamique ajuste ensuite la définition image par image ; si elle reste au plancher et que les images restent lentes, le jeu descend d'un niveau (en mode Auto). Le joueur peut imposer un niveau dans les réglages.

### Collection et sauvegarde

La collection vit dans IndexedDB (`src/store/collection.ts`), avec une copie dans `localStorage` au cas où IndexedDB serait bloquée. L'ancien format du prototype est repris automatiquement. Les réglages permettent d'exporter la collection en JSON et de la réimporter sur un autre appareil ; le fichier est validé avant de remplacer quoi que ce soit.

### Dessin des planches dans un Worker

Les faces des planches (texte, dorures, masques) sont dessinées dans `src/cards/faces.worker.ts` avec OffscreenCanvas, puis transmises au GPU sous forme d'ImageBitmap. Le Worker charge les mêmes fichiers de polices et vérifie qu'elles s'appliquent vraiment ; sinon (anciens Safari, par exemple), le dessin repasse sur le fil principal.

### Robustesse

- **Perte du contexte WebGL** (fréquente sur mobile quand l'onglet passe en arrière-plan) : la partie se met en pause, Three.js recrée ses ressources au retour du contexte, puis tout reprend. Au-delà de 5 secondes, un bouton propose de recharger.
- **Sans WebGL 2** : `main.ts` charge `fallback.ts`, qui présente les 32 planches en images (`public/plates/`) et signale celles de la collection.
- **Hors ligne** : le service worker met en cache tout le jeu au premier chargement. Les pages passent d'abord par le réseau pour récupérer les nouvelles versions.
- **Mobile** : inclinaison des planches au gyroscope (autorisation demandée au premier toucher sur iOS, position neutre qui s'adapte à la façon de tenir le téléphone), son actif même avec le bouton silencieux de l'iPhone, vibrations pendant la déchirure.

### Débogage

`window.CDC` expose l'état et les actions principales (`autoTear()`, `revealNext()`, `skipWalkout()`, `toSummary()`, `inspect(i)`, `setManual(true)`, `advance(sec)`, `gallery()`…), ainsi que `quality`, `device` et `facesInfo` pour vérifier le niveau choisi et le mode de dessin.

## Tests visuels

Le parcours `tests/visual/opening.spec.ts` ouvre une pochette jusqu'à la fiche d'une planche, en bureau et en mobile, avec un hasard et une horloge figés. Il compare six captures aux images de référence et échoue sur toute erreur de console ou transition inattendue. `tests/visual/atlas.spec.ts` parcourt l'Atlas (ciel, planche, retour arrière du navigateur, Album, conversion des doublons, création d'une planche) et un lien direct vers une planche. `tests/visual/robustness.spec.ts` couvre le panneau de réglages (import d'une sauvegarde, changement de qualité), la reprise après une perte du contexte WebGL et la page de repli.

Le rendu WebGL passe par SwiftShader (logiciel) : chaque parcours prend 1 à 2 minutes. Les images de référence du dépôt ont été produites sous Linux, comme en CI. Le rendu des polices diffère sous macOS : pour lancer ces tests sur ton Mac, génère d'abord tes propres références avec `npm run test:visual:update` (elles portent le suffixe `-darwin` et cohabitent avec celles de Linux).

Si la CI échoue uniquement sur des écarts de rendu dus à l'environnement, relance le workflow **CI** à la main avec l'option « Régénérer les images de référence », télécharge l'artefact `snapshots` et remplace le dossier `tests/visual/opening.spec.ts-snapshots/`.

## Déploiement (Vercel)

1. Pousser le dépôt sur GitHub.
2. Sur vercel.com : **Add New → Project**, importer le dépôt. Vercel lit `vercel.json` (framework Vite, build `npm run build`, sortie `dist/`).
3. Chaque branche obtient une URL de prévisualisation, `main` part en production. Le domaine se branche dans **Settings → Domains**.

`vercel.json` renvoie toutes les adresses de l'application (`/atlas`, `/planche/12`…) vers `index.html`, ajoute un cache d'un an sur les fichiers versionnés de `/assets/`, désactive le cache de `sw.js` (pour que les mises à jour arrivent) et pose des en-têtes de sécurité, dont une Content-Security-Policy stricte (aucun script ni police externe).

La CI GitHub (`.github/workflows/ci.yml`) vérifie les types, lance les tests unitaires, construit le site, puis exécute les tests visuels.

## Feuille de route

- [x] **I. Fondations** : Vite, TypeScript, Three.js depuis npm, shaders en fichiers, machine d'états, polices auto-hébergées, CI, tests
- [x] **II. Robustesse** : niveaux de qualité, textures dans un Worker, repli sans WebGL, gyroscope, PWA, IndexedDB
- [x] **III. Atlas céleste** : la collection sur la sphère céleste, Album, poussière d'étoiles, adresses directes
- [ ] **IV. Série II** : 32 nouvelles planches, Atelier de réglage
- [ ] **V. Mise en scène et partage**
- [ ] **VI. Vitrine portfolio**

## Dette technique connue

- Le code migré est typé en mode non strict (`strict: false`) : les classes déclarent leurs champs en `any` et beaucoup de fonctions ont des paramètres implicites. Le typage strict s'active fichier par fichier au fil des étapes.
- Le dessin des planches dans le Worker n'a pas été mesuré sur de vrais appareils : les tests tournent sur un rendu logiciel, trop lent pour donner des chiffres représentatifs.
- `three` est figé en 0.169.0 pour garantir un rendu identique au prototype ; la montée de version se fera avec les tests visuels comme filet.
