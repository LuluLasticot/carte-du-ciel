// ---------------------------------------------------------------------------
// Données : raretés, pochettes, constellations, 32 planches
// ---------------------------------------------------------------------------

export type RGB = [number, number, number];
export interface Tier { key: string; name: string; finish: string; css: string; rgb: RGB; pips: number }
export const TIERS: Tier[] = [
  { key: 'commune', name: 'Commune', finish: 'Gravure', css: '#E6DCC4', rgb: [1.0, 0.88, 0.7], pips: 1 },
  { key: 'rare', name: 'Rare', finish: 'Argentique', css: '#B9CBE4', rgb: [0.6, 0.78, 1.0], pips: 2 },
  { key: 'epique', name: 'Épique', finish: 'Spectrale', css: '#7CEFD9', rgb: [0.28, 1.0, 0.84], pips: 3 },
  { key: 'legendaire', name: 'Légendaire', finish: 'Dorée', css: '#F1C46A', rgb: [1.0, 0.66, 0.22], pips: 4 },
  { key: 'mythique', name: 'Mythique', finish: 'Singularité', css: '#F3EDFF', rgb: [1.0, 0.95, 1.0], pips: 5 },
];

export const PACKS = [
  { key: 'standard', name: 'Standard', slot: [0.64, 0.29, 0.07, 0, 0], last: [0, 0, 0.62, 0.3, 0.08] },
  { key: 'doree', name: 'Dorée', slot: [0.38, 0.44, 0.18, 0, 0], last: [0, 0, 0, 0.8, 0.2] },
  { key: 'singularite', name: 'Singularité', slot: [0.22, 0.46, 0.32, 0, 0], last: [0, 0, 0, 0, 1] },
];

// Constellations : étoiles [ascension droite (h), déclinaison (°), magnitude], tracés [i, j]
export const CONS = {
  ORI: { name: 'Orion', s: [
    [5.919, 7.407, 0.5], [5.242, -8.202, 0.13], [5.419, 6.350, 1.64], [5.533, -0.299, 2.23], [5.604, -1.202, 1.69],
    [5.679, -1.943, 1.77], [5.796, -9.670, 2.09], [5.586, 9.934, 3.39], [6.039, 9.648, 4.1], [6.200, 14.21, 4.5],
    [5.906, 20.28, 4.4], [4.831, 6.961, 3.2], [4.843, 8.900, 4.4], [4.907, 10.15, 4.6], [4.853, 5.605, 3.7],
    [4.904, 2.441, 3.7], [4.976, 1.714, 4.5], [5.590, -5.910, 2.8]],
    l: [[7, 0], [7, 2], [0, 5], [2, 3], [3, 4], [4, 5], [5, 6], [3, 1], [0, 8], [8, 9], [9, 10], [2, 11], [13, 12], [12, 11], [11, 14], [14, 15], [15, 16]] },
  TAU: { name: 'Taureau', s: [
    [4.599, 16.51, 0.85], [5.438, 28.61, 1.65], [5.628, 21.14, 3.0], [4.478, 15.87, 3.4], [4.330, 15.63, 3.65],
    [4.382, 17.54, 3.76], [4.477, 19.18, 3.53], [4.011, 12.49, 3.4], [3.414, 9.03, 3.6], [3.791, 24.11, 2.87]],
    l: [[7, 4], [4, 5], [5, 6], [6, 1], [4, 3], [3, 0], [0, 2], [7, 8]] },
  LYR: { name: 'Lyre', s: [
    [18.616, 38.78, 0.03], [18.835, 33.36, 3.5], [18.983, 32.69, 3.25], [18.908, 36.90, 4.3], [18.746, 37.61, 4.4], [18.739, 39.67, 4.7]],
    l: [[0, 5], [0, 4], [4, 1], [1, 2], [2, 3], [3, 4]] },
  CYG: { name: 'Cygne', s: [
    [20.690, 45.28, 1.25], [20.371, 40.26, 2.23], [19.512, 27.96, 3.1], [20.770, 33.97, 2.48], [19.750, 45.13, 2.87],
    [21.216, 30.23, 3.2], [19.285, 53.37, 3.8], [19.938, 35.08, 3.9]],
    l: [[0, 1], [1, 7], [7, 2], [4, 1], [1, 3], [4, 6], [3, 5]] },
  AND: { name: 'Andromède', s: [
    [0.140, 29.09, 2.06], [0.655, 30.86, 3.27], [1.162, 35.62, 2.05], [2.065, 42.33, 2.1], [0.946, 38.50, 3.87], [0.830, 41.08, 4.5], [0.615, 33.72, 4.36]],
    l: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [1, 6]] },
  SGR: { name: 'Sagittaire', s: [
    [18.403, -34.38, 1.85], [18.921, -26.30, 2.05], [19.044, -29.88, 2.6], [18.350, -29.83, 2.7], [18.466, -25.42, 2.8],
    [18.097, -30.42, 2.99], [18.761, -26.99, 3.17], [19.116, -27.67, 3.3], [18.294, -36.76, 3.1]],
    l: [[5, 3], [5, 0], [3, 0], [3, 4], [4, 6], [3, 6], [6, 2], [2, 0], [6, 1], [1, 7], [7, 2], [0, 8]] },
  VIR: { name: 'Vierge', s: [
    [13.420, -11.16, 0.97], [12.694, -1.45, 2.74], [13.036, 10.96, 2.8], [12.927, 3.40, 3.4], [13.578, -0.60, 3.4],
    [11.845, 1.76, 3.6], [12.332, -0.67, 3.9], [13.166, -5.54, 4.4], [14.267, -6.00, 4.1], [14.718, -5.66, 3.9]],
    l: [[5, 6], [6, 1], [1, 3], [3, 2], [1, 7], [7, 0], [3, 4], [4, 8], [8, 9]] },
  SER: { name: 'Serpent', s: [
    [18.355, -2.90, 3.26], [18.937, 4.20, 4.1], [17.627, -15.40, 3.5], [17.347, -12.85, 4.3], [17.690, -12.88, 4.3], [18.587, -8.24, 3.85]],
    l: [[3, 2], [2, 4], [4, 0], [0, 1]] },
  DRA: { name: 'Dragon', s: [
    [17.943, 51.49, 2.24], [17.507, 52.30, 2.79], [17.892, 56.87, 3.75], [17.538, 55.18, 4.9], [19.209, 67.66, 3.07],
    [19.803, 70.27, 3.83], [18.351, 72.73, 3.57], [17.146, 65.71, 3.17], [16.400, 61.51, 2.73], [16.031, 58.56, 4.0],
    [15.416, 58.97, 3.29], [14.073, 64.38, 3.65], [12.558, 69.79, 3.87], [11.523, 69.33, 3.84]],
    l: [[1, 0], [0, 2], [2, 3], [3, 1], [2, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13]] },
  CVN: { name: 'Chiens de chasse', s: [
    [12.934, 38.32, 2.9], [12.562, 41.36, 4.26], [13.792, 49.31, 1.86], [13.399, 54.93, 2.23], [12.900, 55.96, 1.77]],
    l: [[0, 1], [2, 3], [3, 4]] },
  CMA: { name: 'Grand Chien', s: [
    [6.752, -16.72, -1.46], [6.378, -17.96, 1.98], [6.977, -28.97, 1.5], [7.140, -26.39, 1.84], [7.402, -29.30, 2.45],
    [7.063, -15.63, 4.1], [6.936, -17.05, 4.4], [7.050, -23.83, 3.0], [6.339, -30.06, 3.0]],
    l: [[1, 0], [0, 6], [6, 5], [0, 7], [7, 3], [3, 2], [3, 4], [2, 8]] },
  UMI: { name: 'Petite Ourse', s: [
    [2.530, 89.26, 1.98], [17.537, 86.59, 4.36], [16.766, 82.04, 4.2], [15.734, 77.79, 4.3], [14.845, 74.16, 2.08], [15.346, 71.83, 3.0], [16.292, 75.76, 4.95]],
    l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
  CEN: { name: 'Centaure', s: [
    [14.660, -60.83, -0.27], [14.064, -60.37, 0.61], [14.111, -36.37, 2.06], [13.665, -53.47, 2.3], [13.926, -47.29, 2.55],
    [14.592, -42.16, 2.35], [12.692, -48.96, 2.17], [12.139, -50.72, 2.6], [13.343, -36.71, 2.75]],
    l: [[0, 1], [1, 3], [3, 4], [4, 5], [5, 2], [2, 8], [4, 6], [6, 7]] },
  CNC: { name: 'Cancer', s: [
    [8.975, 11.86, 4.25], [8.275, 9.19, 3.5], [8.745, 18.15, 3.94], [8.722, 21.47, 4.66], [8.778, 28.76, 4.0]],
    l: [[1, 2], [2, 0], [2, 3], [3, 4]] },
  HER: { name: 'Hercule', s: [
    [17.251, 36.81, 3.16], [16.715, 38.92, 3.5], [16.688, 31.60, 2.81], [17.005, 30.93, 3.92], [16.504, 21.49, 2.78], [17.251, 24.84, 3.14], [17.244, 14.39, 3.1]],
    l: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [3, 5], [5, 6]] },
};

// Types de rendu procédural
export const ART = { PLANET: 1, STAR: 2, CLUSTER: 3, COMET: 4, PN: 5, REMNANT: 6, GALAXY: 7, NEBULA: 8, PULSAR: 9, BLACKHOLE: 10 };

// s: [libellé, valeur, unité]   d: [année, découvreur]
export type Stat = [label: string, value: string, unit: string];
export interface CardArt { t: number; A: number[]; B?: number[]; c1?: number[]; c2?: number[] }
export interface CardData {
  /** numéro de planche (1 à 32) */
  n: number;
  name: string;
  /** code court affiché sous la magnitude (PLA, ÉTO, NÉB…) */
  code: string;
  /** rareté : 0 commune → 4 mythique */
  tier: number;
  /** constellation (clé de CONS) ou null pour le Système solaire */
  con: string | null;
  /** ascension droite (heures) et déclinaison (degrés) */
  ra?: number;
  dec?: number;
  mag: string;
  type: string;
  sub: string;
  s: Stat[];
  d: [year: string, by: string];
  l1: string;
  l2: string;
  desc: string;
  art: CardArt;
}
export const CARDS: CardData[] = [
  { n: 1, name: 'La Lune', code: 'SAT', tier: 0, con: null, mag: '−12,7', type: 'Satellite naturel', sub: 'Système solaire',
    s: [['Distance', '384 400', 'km'], ['Diamètre', '3 474', 'km']], d: ['Antiquité', ''],
    l1: 'Satellite naturel de la Terre', l2: 'Période orbitale 27,3 jours',
    desc: "Le seul astre sur lequel l'humanité a marché. Elle s'éloigne de la Terre d'environ 3,8 cm par an.",
    art: { t: ART.PLANET, A: [0.64, 0.12, 0.025, 0], B: [0, 0, 0, 0], c1: [0, 0, 0] } },
  { n: 2, name: 'Mars', code: 'PLA', tier: 0, con: null, mag: '−2,9', type: 'Planète tellurique', sub: 'Système solaire',
    s: [['Distance', '1,52', 'UA'], ['Diamètre', '6 779', 'km']], d: ['Antiquité', ''],
    l1: 'Quatrième planète du Système solaire', l2: 'Période orbitale 687 jours',
    desc: "Sa couleur rouille vient de l'oxyde de fer qui couvre sa surface. Olympus Mons y culmine à près de 22 km.",
    art: { t: ART.PLANET, A: [0.62, 0.44, 0.05, 1], B: [0, 0, 0, 0], c1: [0.9, 0.5, 0.4] } },
  { n: 3, name: 'Vénus', code: 'PLA', tier: 0, con: null, mag: '−4,9', type: 'Planète tellurique', sub: 'Système solaire',
    s: [['Distance', '0,72', 'UA'], ['Diamètre', '12 104', 'km']], d: ['Antiquité', ''],
    l1: 'Deuxième planète du Système solaire', l2: 'Période orbitale 225 jours',
    desc: "Après la Lune, l'astre le plus brillant de la nuit. Sous ses nuages d'acide sulfurique, le sol dépasse 460 °C.",
    art: { t: ART.PLANET, A: [0.62, 0.05, 0.012, 2], B: [0, 0, 0, 0], c1: [1.0, 0.86, 0.6] } },
  { n: 4, name: 'Europe', code: 'SAT', tier: 0, con: null, mag: '5,3', type: 'Lune galiléenne', sub: 'Système solaire',
    s: [['Orbite', '671 000', 'km'], ['Diamètre', '3 122', 'km']], d: ['1610', 'Galilée'],
    l1: 'Satellite de Jupiter · Jupiter II', l2: 'Période orbitale 3,55 jours',
    desc: "Sa croûte de glace striée cacherait un océan d'eau salée plus vaste que tous ceux de la Terre.",
    art: { t: ART.PLANET, A: [0.6, 0.08, 0.03, 3], B: [0, 0, 0, 0], c1: [0, 0, 0] } },
  { n: 5, name: 'Titan', code: 'SAT', tier: 0, con: null, mag: '8,2', type: 'Lune de Saturne', sub: 'Système solaire',
    s: [['Orbite', '1,22', 'M km'], ['Diamètre', '5 150', 'km']], d: ['1655', 'C. Huygens'],
    l1: 'Satellite de Saturne · Saturne VI', l2: 'Période orbitale 15,9 jours',
    desc: "La seule lune dotée d'une atmosphère épaisse. Des lacs de méthane liquide dorment sous sa brume orangée.",
    art: { t: ART.PLANET, A: [0.58, 0.1, 0.02, 4], B: [0, 0, 0, 0], c1: [1.0, 0.62, 0.28] } },
  { n: 6, name: 'Cérès', code: 'NAI', tier: 0, con: null, mag: '6,6', type: 'Planète naine', sub: 'Ceinture d’astéroïdes',
    s: [['Distance', '2,77', 'UA'], ['Diamètre', '940', 'km']], d: ['1801', 'G. Piazzi'],
    l1: 'Planète naine · (1) Cérès', l2: 'Période orbitale 4,6 ans',
    desc: "Le plus gros objet de la ceinture d'astéroïdes. Ses taches blanches sont des dépôts de sels.",
    art: { t: ART.PLANET, A: [0.56, 0.07, 0.05, 5], B: [0, 0, 0, 0], c1: [0, 0, 0] } },
  { n: 7, name: 'Sirius', code: 'ÉTO', tier: 0, con: 'CMA', ra: 6.7525, dec: -16.716, mag: '−1,46', type: 'Étoile blanche', sub: 'Grand Chien',
    s: [['Distance', '8,6', 'al'], ['Diamètre', '2,4', 'M km']], d: ['Antiquité', ''],
    l1: 'α Canis Majoris · A1 V', l2: 'α 06h 45m 09s · δ −16° 42′ 58″',
    desc: "L'étoile la plus brillante du ciel nocturne. Elle forme un couple avec Sirius B, une naine blanche.",
    art: { t: ART.STAR, A: [0.07, 1.0, 0, 1], c1: [0.82, 0.9, 1.0], c2: [0.55, 0.72, 1.0] } },
  { n: 8, name: 'Véga', code: 'ÉTO', tier: 0, con: 'LYR', ra: 18.6156, dec: 38.784, mag: '0,03', type: 'Étoile blanche', sub: 'Lyre',
    s: [['Distance', '25', 'al'], ['Diamètre', '3,5', 'M km']], d: ['Antiquité', ''],
    l1: 'α Lyrae · A0 V', l2: 'α 18h 36m 56s · δ +38° 47′ 01″',
    desc: "Étalon historique de la magnitude zéro. Vers l'an 14 000, la précession en fera notre étoile polaire.",
    art: { t: ART.STAR, A: [0.065, 0.9, 0, 2], c1: [0.84, 0.9, 1.0], c2: [0.6, 0.75, 1.0] } },
  { n: 9, name: 'Étoile polaire', code: 'ÉTO', tier: 0, con: 'UMI', ra: 2.5303, dec: 89.264, mag: '1,98', type: 'Supergéante jaune', sub: 'Petite Ourse',
    s: [['Distance', '≈ 430', 'al'], ['Diamètre', '52', 'M km']], d: ['Antiquité', ''],
    l1: 'α Ursae Minoris · F7 Ib', l2: 'α 02h 31m 49s · δ +89° 15′ 51″',
    desc: "Presque immobile au-dessus du pôle Nord céleste, elle guide les navigateurs. C'est en réalité un système triple.",
    art: { t: ART.STAR, A: [0.062, 0.8, 0, 3], c1: [1.0, 0.94, 0.8], c2: [1.0, 0.85, 0.6] } },
  { n: 10, name: 'Proxima du Centaure', code: 'ÉTO', tier: 0, con: 'CEN', ra: 14.4953, dec: -62.679, mag: '11,1', type: 'Naine rouge', sub: 'Centaure',
    s: [['Distance', '4,24', 'al'], ['Diamètre', '214 000', 'km']], d: ['1915', 'R. Innes'],
    l1: 'α Centauri C · M5,5 Ve', l2: 'α 14h 29m 43s · δ −62° 40′ 46″',
    desc: "L'étoile la plus proche du Soleil. Trop faible pour l'œil nu, elle abrite au moins une planète en zone habitable.",
    art: { t: ART.STAR, A: [0.22, 0.25, 2, 0], c1: [1.0, 0.42, 0.22], c2: [1.0, 0.35, 0.2] } },
  { n: 11, name: 'La Ruche', code: 'AMA', tier: 0, con: 'CNC', ra: 8.6733, dec: 19.667, mag: '3,7', type: 'Amas ouvert', sub: 'Cancer',
    s: [['Distance', '577', 'al'], ['Étoiles', '≈ 1 000', '']], d: ['Antiquité', ''],
    l1: 'M44 · NGC 2632', l2: 'α 08h 40m 24s · δ +19° 40′ 00″',
    desc: "Une tache laiteuse à l'œil nu. En 1610, Galilée y distingua le premier une quarantaine d'étoiles.",
    art: { t: ART.CLUSTER, A: [0.55, 1.0, 0, 0] } },
  { n: 12, name: 'Comète de Halley', code: 'COM', tier: 0, con: null, mag: '2,1', type: 'Comète périodique', sub: 'Système solaire',
    s: [['Orbite', '0,6 – 35', 'UA'], ['Noyau', '15 × 8', 'km']], d: ['1705', 'E. Halley'],
    l1: '1P/Halley · comète périodique', l2: 'Période 76 ans · retour en 2061',
    desc: "Edmond Halley comprit qu'il s'agissait d'un même astre revenant tous les 76 ans. Prochain passage : 2061.",
    art: { t: ART.COMET, A: [0, 0.38, 1.0, 0.45] } },
  { n: 13, name: 'Jupiter', code: 'PLA', tier: 1, con: null, mag: '−2,9', type: 'Géante gazeuse', sub: 'Système solaire',
    s: [['Distance', '5,20', 'UA'], ['Diamètre', '139 820', 'km']], d: ['Antiquité', ''],
    l1: 'Cinquième planète du Système solaire', l2: 'Période orbitale 11,9 ans',
    desc: "Sa Grande Tache rouge est une tempête plus large que la Terre, observée sans interruption depuis 1830.",
    art: { t: ART.PLANET, A: [0.66, 0.05, 0.07, 6], B: [0, 0, 0, 0], c1: [0.95, 0.85, 0.7] } },
  { n: 14, name: 'Saturne', code: 'PLA', tier: 1, con: null, mag: '−0,5', type: 'Géante gazeuse', sub: 'Système solaire',
    s: [['Distance', '9,58', 'UA'], ['Diamètre', '116 460', 'km']], d: ['Antiquité', ''],
    l1: 'Sixième planète du Système solaire', l2: 'Période orbitale 29,4 ans',
    desc: "Ses anneaux principaux s'étendent sur 280 000 km mais ne font souvent qu'une dizaine de mètres d'épaisseur.",
    art: { t: ART.PLANET, A: [0.35, 0.42, 0.06, 7], B: [0.4, 1.24, 2.27, 1], c1: [0.95, 0.85, 0.65] } },
  { n: 15, name: 'Neptune', code: 'PLA', tier: 1, con: null, mag: '7,8', type: 'Géante de glaces', sub: 'Système solaire',
    s: [['Distance', '30,1', 'UA'], ['Diamètre', '49 244', 'km']], d: ['1846', 'U. Le Verrier'],
    l1: 'Huitième planète du Système solaire', l2: 'Période orbitale 165 ans',
    desc: "Découverte par le calcul avant d'être vue : Urbain Le Verrier en avait prédit la position depuis Paris.",
    art: { t: ART.PLANET, A: [0.6, 0.5, 0.06, 8], B: [0, 0, 0, 0], c1: [0.35, 0.6, 1.0] } },
  { n: 16, name: 'Bételgeuse', code: 'ÉTO', tier: 1, con: 'ORI', ra: 5.9195, dec: 7.407, mag: '0,5', type: 'Supergéante rouge', sub: 'Orion',
    s: [['Distance', '≈ 550', 'al'], ['Diamètre', '≈ 1', 'Md km']], d: ['Antiquité', ''],
    l1: 'α Orionis · M1–2 Ia', l2: 'α 05h 55m 10s · δ +07° 24′ 25″',
    desc: "Placée au centre du Système solaire, elle engloutirait l'orbite de Mars. Elle finira en supernova.",
    art: { t: ART.STAR, A: [0.5, 0, 1, 0], c1: [1.0, 0.48, 0.2], c2: [1.0, 0.4, 0.2] } },
  { n: 17, name: 'Rigel', code: 'ÉTO', tier: 1, con: 'ORI', ra: 5.2423, dec: -8.2016, mag: '0,13', type: 'Supergéante bleue', sub: 'Orion',
    s: [['Distance', '≈ 860', 'al'], ['Diamètre', '110', 'M km']], d: ['Antiquité', ''],
    l1: 'β Orionis · B8 Ia', l2: 'α 05h 14m 32s · δ −08° 12′ 06″',
    desc: "Environ 120 000 fois plus lumineuse que le Soleil, elle marque le pied gauche d'Orion.",
    art: { t: ART.STAR, A: [0.08, 1.25, 0, 4], c1: [0.72, 0.84, 1.0], c2: [0.5, 0.68, 1.0] } },
  { n: 18, name: 'Les Pléiades', code: 'AMA', tier: 1, con: 'TAU', ra: 3.79, dec: 24.117, mag: '1,6', type: 'Amas ouvert', sub: 'Taureau',
    s: [['Distance', '444', 'al'], ['Étoiles', '> 1 000', '']], d: ['Antiquité', ''],
    l1: 'M45 · les Sept Sœurs', l2: 'α 03h 47m 24s · δ +24° 07′ 00″',
    desc: "Un jeune amas d'environ 100 millions d'années, voilé par un nuage de poussière qu'il est en train de traverser.",
    art: { t: ART.CLUSTER, A: [0.6, 1.0, 1, 1] } },
  { n: 19, name: "Amas d'Hercule", code: 'AMA', tier: 1, con: 'HER', ra: 16.6947, dec: 36.46, mag: '5,8', type: 'Amas globulaire', sub: 'Hercule',
    s: [['Distance', '22 200', 'al'], ['Étoiles', '≈ 300 000', '']], d: ['1714', 'E. Halley'],
    l1: 'M13 · NGC 6205', l2: 'α 16h 41m 41s · δ +36° 27′ 35″',
    desc: "Des centaines de milliers d'étoiles serrées sur 145 années-lumière. Le message d'Arecibo lui a été adressé en 1974.",
    art: { t: ART.CLUSTER, A: [0.3, 1.0, 2, 0] } },
  { n: 20, name: 'Comète Hale-Bopp', code: 'COM', tier: 1, con: null, mag: '−0,8', type: 'Grande comète', sub: 'Système solaire',
    s: [['Périhélie', '0,91', 'UA'], ['Noyau', '≈ 60', 'km']], d: ['1995', 'Hale & Bopp'],
    l1: 'C/1995 O1 · grande comète', l2: 'Période ≈ 2 400 ans',
    desc: "Visible à l'œil nu pendant un record de 18 mois en 1996-1997, avec deux queues bien distinctes.",
    art: { t: ART.COMET, A: [1, 0.55, 1.2, 1.0] } },
  { n: 21, name: "Nébuleuse de l'Anneau", code: 'NÉB', tier: 2, con: 'LYR', ra: 18.8931, dec: 33.029, mag: '8,8', type: 'Nébuleuse planétaire', sub: 'Lyre',
    s: [['Distance', '≈ 2 600', 'al'], ['Diamètre', '≈ 1,3', 'al']], d: ['1779', 'A. Darquier'],
    l1: 'M57 · NGC 6720', l2: 'α 18h 53m 35s · δ +33° 01′ 45″',
    desc: "Les couches externes d'une étoile mourante, soufflées en anneau autour d'une naine blanche à plus de 100 000 °C.",
    art: { t: ART.PN, A: [0, 0.4, 1, 0] } },
  { n: 22, name: 'Œil de chat', code: 'NÉB', tier: 2, con: 'DRA', ra: 17.9758, dec: 66.633, mag: '8,1', type: 'Nébuleuse planétaire', sub: 'Dragon',
    s: [['Distance', '≈ 3 300', 'al'], ['Diamètre', '≈ 0,4', 'al']], d: ['1786', 'W. Herschel'],
    l1: 'NGC 6543', l2: 'α 17h 58m 33s · δ +66° 37′ 59″',
    desc: "L'une des nébuleuses planétaires les plus complexes connues : des coquilles de gaz expulsées environ tous les 1 500 ans.",
    art: { t: ART.PN, A: [1, -0.35, 1, 0] } },
  { n: 23, name: 'Nébuleuse du Crabe', code: 'RÉM', tier: 2, con: 'TAU', ra: 5.5756, dec: 22.0145, mag: '8,4', type: 'Rémanent de supernova', sub: 'Taureau',
    s: [['Distance', '6 500', 'al'], ['Diamètre', '11', 'al']], d: ['1731', 'J. Bevis'],
    l1: 'M1 · NGC 1952', l2: 'α 05h 34m 32s · δ +22° 00′ 52″',
    desc: "Les débris de la supernova notée par les astronomes chinois en 1054, restée visible en plein jour pendant 23 jours.",
    art: { t: ART.REMNANT, A: [0, 0.5, 0, 0] } },
  { n: 24, name: 'Dentelles du Cygne', code: 'RÉM', tier: 2, con: 'CYG', ra: 20.7606, dec: 30.708, mag: '7,0', type: 'Rémanent de supernova', sub: 'Cygne',
    s: [['Distance', '≈ 2 400', 'al'], ['Diamètre', '≈ 110', 'al']], d: ['1784', 'W. Herschel'],
    l1: 'NGC 6960 · NGC 6992', l2: 'α 20h 45m 38s · δ +30° 42′ 30″',
    desc: "Les filaments d'une étoile qui a explosé il y a 10 000 à 20 000 ans. L'ensemble couvre six fois la largeur de la pleine Lune.",
    art: { t: ART.REMNANT, A: [1, 0, 0, 0] } },
  { n: 25, name: 'Galaxie du Tourbillon', code: 'GAL', tier: 2, con: 'CVN', ra: 13.4981, dec: 47.195, mag: '8,4', type: 'Galaxie spirale', sub: 'Chiens de chasse',
    s: [['Distance', '≈ 31', 'M al'], ['Diamètre', '≈ 76 000', 'al']], d: ['1773', 'C. Messier'],
    l1: 'M51 · NGC 5194', l2: 'α 13h 29m 53s · δ +47° 11′ 43″',
    desc: "La première galaxie dont on a vu la spirale, dessinée par Lord Rosse en 1845. Elle interagit avec sa voisine NGC 5195.",
    art: { t: ART.GALAXY, A: [0.86, 0.3, 2, 0.36], B: [0.1, 0.8, 0, 0.02] } },
  { n: 26, name: 'Galaxie du Sombrero', code: 'GAL', tier: 2, con: 'VIR', ra: 12.6664, dec: -11.623, mag: '8,0', type: 'Galaxie spirale', sub: 'Vierge',
    s: [['Distance', '≈ 31', 'M al'], ['Diamètre', '≈ 49 000', 'al']], d: ['1781', 'P. Méchain'],
    l1: 'M104 · NGC 4594', l2: 'α 12h 39m 59s · δ −11° 37′ 23″',
    desc: "Vue presque par la tranche, elle est ceinte d'une bande de poussière. Son trou noir central pèserait un milliard de Soleils.",
    art: { t: ART.GALAXY, A: [0.14, -0.1, 2, 0.3], B: [0.28, 1.0, 1, 0] } },
  { n: 27, name: "Nébuleuse d'Orion", code: 'NÉB', tier: 3, con: 'ORI', ra: 5.5881, dec: -5.391, mag: '4,0', type: 'Nébuleuse en émission', sub: 'Orion',
    s: [['Distance', '1 344', 'al'], ['Diamètre', '≈ 24', 'al']], d: ['1610', 'N.-C. de Peiresc'],
    l1: 'M42 · NGC 1976', l2: 'α 05h 35m 17s · δ −05° 23′ 28″',
    desc: "La pouponnière d'étoiles la plus proche de nous, visible à l'œil nu dans l'épée d'Orion. Les étoiles du Trapèze l'illuminent.",
    art: { t: ART.NEBULA, A: [0, 0, 0, 0] } },
  { n: 28, name: "Galaxie d'Andromède", code: 'GAL', tier: 3, con: 'AND', ra: 0.7123, dec: 41.269, mag: '3,4', type: 'Galaxie spirale', sub: 'Andromède',
    s: [['Distance', '2,5', 'M al'], ['Diamètre', '≈ 152 000', 'al']], d: ['964', 'Al-Soufi'],
    l1: 'M31 · NGC 224', l2: 'α 00h 42m 44s · δ +41° 16′ 09″',
    desc: "L'objet le plus lointain visible à l'œil nu. Elle fonce vers la Voie lactée à 110 km/s : rencontre dans 4 à 5 milliards d'années.",
    art: { t: ART.GALAXY, A: [0.3, 0.62, 2, 0.22], B: [0.13, 0.9, 2, 0.012] } },
  { n: 29, name: 'Piliers de la Création', code: 'NÉB', tier: 3, con: 'SER', ra: 18.3133, dec: -13.817, mag: '6,0', type: 'Nébuleuse en émission', sub: 'Serpent',
    s: [['Distance', '≈ 5 700', 'al'], ['Hauteur', '≈ 4', 'al']], d: ['1745', 'J.-P. de Chéseaux'],
    l1: "M16 · Nébuleuse de l'Aigle", l2: 'α 18h 18m 48s · δ −13° 49′ 00″',
    desc: "Des colonnes de gaz et de poussière où naissent des étoiles, révélées par Hubble en 1995. La plus haute mesure environ 4 années-lumière.",
    art: { t: ART.NEBULA, A: [1, 0, 0, 0] } },
  { n: 30, name: 'Pulsar du Crabe', code: 'PUL', tier: 3, con: 'TAU', ra: 5.5756, dec: 22.0145, mag: '16,5', type: 'Étoile à neutrons', sub: 'Taureau',
    s: [['Distance', '6 500', 'al'], ['Rotation', '30', 'tours/s']], d: ['1968', 'Staelin & Reifenstein'],
    l1: 'PSR B0531+21', l2: 'α 05h 34m 32s · δ +22° 00′ 52″',
    desc: "Le cœur effondré de l'étoile de 1054 : une sphère d'une vingtaine de kilomètres qui tourne 30 fois par seconde.",
    art: { t: ART.PULSAR, A: [0, 0, 0, 0] } },
  { n: 31, name: 'Sagittarius A*', code: 'TNS', tier: 4, con: 'SGR', ra: 17.7611, dec: -29.0078, mag: '∞', type: 'Trou noir supermassif', sub: 'Sagittaire',
    s: [['Distance', '26 700', 'al'], ['Masse', '4,3 millions', 'M☉']], d: ['1974', 'Balick & Brown'],
    l1: 'Sgr A* · centre de la Voie lactée', l2: 'α 17h 45m 40s · δ −29° 00′ 28″',
    desc: "Le trou noir au centre de la Voie lactée. L'Event Horizon Telescope en a dévoilé la première image en 2022.",
    art: { t: ART.BLACKHOLE, A: [0, 0.23, 0.2, 1.0] } },
  { n: 32, name: 'M87*', code: 'TNS', tier: 4, con: 'VIR', ra: 12.5137, dec: 12.391, mag: '∞', type: 'Trou noir supermassif', sub: 'Vierge',
    s: [['Distance', '53,5', 'M al'], ['Masse', '6,5 milliards', 'M☉']], d: ['2019', 'Event Horizon Telescope'],
    l1: 'Messier 87 · galaxie elliptique', l2: 'α 12h 30m 49s · δ +12° 23′ 28″',
    desc: "Le premier trou noir photographié, en avril 2019. Il pèse 6,5 milliards de Soleils et projette un jet de 5 000 années-lumière.",
    art: { t: ART.BLACKHOLE, A: [1, 0.2, 0, 0.6] } },
];

// distances « pour le compteur » de la séquence finale (valeur, unité)
export const DIST_ROLL = {
  21: ['2 600', 'années-lumière'], 22: ['3 300', 'années-lumière'], 23: ['6 500', 'années-lumière'], 24: ['2 400', 'années-lumière'],
  25: ['31 000 000', 'années-lumière'], 26: ['31 000 000', 'années-lumière'], 27: ['1 344', 'années-lumière'],
  28: ['2 500 000', 'années-lumière'], 29: ['5 700', 'années-lumière'], 30: ['6 500', 'années-lumière'],
  31: ['26 700', 'années-lumière'], 32: ['53 500 000', 'années-lumière'],
};
