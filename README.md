# Carte du Ciel

Ouverture de pochettes de planches célestes en 3D. On déchire la pochette du doigt ou à la souris, on découvre cinq planches une à une, et la plus rare a droit à sa propre séquence : le ciel pivote vers sa constellation, un réticule l'accroche, sa distance défile, puis elle surgit.

Série I : 32 planches, 5 raretés (Commune, Rare, Épique, Légendaire, Mythique) et 5 finitions (Gravure, Argentique, Spectrale, Dorée, Singularité). Tout est procédural : illustrations en shaders GLSL, textures dessinées au canvas, sons synthétisés en WebAudio. Aucune image ni aucun son externe.

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

Ancres utiles : `/#epique`, `/#legendaire` et `/#mythique` forcent la rareté de la dernière planche.

## Organisation

```
src/
├─ main.ts         entrée : saisie (pointeur, clavier), boucle, démarrage
├─ core/           outils (tweens, easings, ressorts), aléatoire pur, pointeur partagé
├─ data/           catalogue de la Série I (raretés, pochettes, constellations, planches), tirage
├─ flow/           déroulé d'une ouverture et machine d'états
├─ render/         renderer, bloom et composition, ciel, constellations, caméra, particules
├─ cards/          planche 3D et dessin des faces au canvas
├─ pack/           pochette et mécanique de déchirure
├─ audio/          sons synthétisés
├─ ui/             interface HTML par-dessus la scène
├─ store/          sauvegarde locale de la collection
├─ shaders/        GLSL, un fichier par shader, importés en texte brut (?raw)
├─ styles/         CSS
└─ assets/fonts/   Bodoni Moda et Martian Mono auto-hébergées (SIL OFL)
tests/
├─ unit/           tirages et probabilités, catalogue, machine d'états, tweens
└─ visual/         parcours Playwright et images de référence
```

### Machine d'états

`src/flow/machine.ts` déclare les états de l'enchaînement et les transitions permises :

```
loading → idle → tearing → opening → reveal → walkout → hero → transition → summary ⇄ inspect
                                                                              summary → transition → idle
```

Tout changement d'état passe par `go()` (`src/flow/flow.ts`). Une transition absente de la table lève une erreur en développement et un avertissement en production : les courses entre animations deviennent visibles au lieu de produire un écran incohérent.

### Temps du jeu

Toutes les animations suivent `Clock.t` (et non l'horloge du navigateur). `nextFrame()` attend la prochaine image du jeu. C'est ce qui rend les tests visuels reproductibles : ils pilotent le temps image par image avec `CDC.advance()`.

### Débogage

`window.CDC` expose l'état et les actions principales (`autoTear()`, `revealNext()`, `skipWalkout()`, `toSummary()`, `inspect(i)`, `setManual(true)`, `advance(sec)`, `gallery()`…).

## Tests visuels

Le parcours `tests/visual/opening.spec.ts` ouvre une pochette jusqu'à la fiche d'une planche, en bureau et en mobile, avec un hasard et une horloge figés. Il compare six captures aux images de référence et échoue sur toute erreur de console ou transition inattendue.

Le rendu WebGL passe par SwiftShader (logiciel) : chaque parcours prend 1 à 2 minutes. Les images de référence du dépôt ont été produites sous Linux, comme en CI. Le rendu des polices diffère sous macOS : pour lancer ces tests sur ton Mac, génère d'abord tes propres références avec `npm run test:visual:update` (elles portent le suffixe `-darwin` et cohabitent avec celles de Linux).

Si la CI échoue uniquement sur des écarts de rendu dus à l'environnement, relance le workflow **CI** à la main avec l'option « Régénérer les images de référence », télécharge l'artefact `snapshots` et remplace le dossier `tests/visual/opening.spec.ts-snapshots/`.

## Déploiement (Vercel)

1. Pousser le dépôt sur GitHub.
2. Sur vercel.com : **Add New → Project**, importer le dépôt. Vercel lit `vercel.json` (framework Vite, build `npm run build`, sortie `dist/`).
3. Chaque branche obtient une URL de prévisualisation, `main` part en production. Le domaine se branche dans **Settings → Domains**.

`vercel.json` ajoute un cache d'un an sur les fichiers versionnés de `/assets/` et des en-têtes de sécurité, dont une Content-Security-Policy stricte (aucun script ni police externe).

La CI GitHub (`.github/workflows/ci.yml`) vérifie les types, lance les tests unitaires, construit le site, puis exécute les tests visuels.

## Feuille de route

- [x] **I. Fondations** : Vite, TypeScript, Three.js depuis npm, shaders en fichiers, machine d'états, polices auto-hébergées, CI, tests
- [ ] **II. Robustesse** : niveaux de qualité, textures dans un Worker, repli sans WebGL, gyroscope, PWA, IndexedDB
- [ ] **III. Atlas céleste** : la collection affichée sur la sphère céleste
- [ ] **IV. Série II** : 32 nouvelles planches, Atelier de réglage
- [ ] **V. Mise en scène et partage**
- [ ] **VI. Vitrine portfolio**

## Dette technique connue

- Le code migré est typé en mode non strict (`strict: false`) : les classes déclarent leurs champs en `any` et beaucoup de fonctions ont des paramètres implicites. Le typage strict s'active fichier par fichier au fil des étapes.
- `three` est figé en 0.169.0 pour garantir un rendu identique au prototype ; la montée de version se fera avec les tests visuels comme filet.
