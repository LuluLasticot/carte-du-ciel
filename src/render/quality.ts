// Niveaux de qualité graphique : choisis au démarrage selon l'appareil, ajustables dans les réglages.
// Ce module est pur (aucun accès au DOM) pour pouvoir être testé.

export type QualityLevel = 'low' | 'medium' | 'high';
export type QualityChoice = 'auto' | QualityLevel;

export interface QualityProfile {
  level: QualityLevel;
  /** plafond du rapport de pixels (écrans Retina) */
  maxDpr: number;
  /** échantillons d'anticrénelage de la scène (0 = aucun) */
  msaa: number;
  /** nombre de niveaux du bloom (profondeur du halo) */
  bloomLevels: number;
  /** part des particules conservées */
  particles: number;
  /** échelle des textures de planches (1 = 1000 × 1400 px) */
  texScale: number;
  /** plancher de la résolution dynamique */
  minRes: number;
}

export const PROFILES: Record<QualityLevel, QualityProfile> = {
  low: { level: 'low', maxDpr: 1.25, msaa: 0, bloomLevels: 4, particles: 0.45, texScale: 0.8, minRes: 0.6 },
  medium: { level: 'medium', maxDpr: 1.6, msaa: 2, bloomLevels: 5, particles: 0.75, texScale: 1, minRes: 0.55 },
  high: { level: 'high', maxDpr: 2, msaa: 4, bloomLevels: 6, particles: 1, texScale: 1.25, minRes: 0.55 },
};

export const LEVELS: QualityLevel[] = ['low', 'medium', 'high'];

export interface DeviceInfo {
  /** chaîne du GPU (WEBGL_debug_renderer_info), vide si inconnue */
  gpu: string;
  mobile: boolean;
  /** mémoire annoncée en Go (navigator.deviceMemory), 0 si inconnue */
  memory: number;
  /** cœurs logiques, 0 si inconnu */
  cores: number;
  /** plus petit côté de l'écran en pixels physiques */
  screenPx: number;
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;
const WEAK_MOBILE = /mali-(4|t)|adreno \(tm\) ?[345]\d\d|adreno [345]\d\d|powervr|sgx|videocore|vivante|tegra/i;
const MID_MOBILE = /adreno \(tm\) ?6[0-3]\d|adreno 6[0-3]\d|mali-g(5|6|7[0-6])/i;
const DESKTOP_DISCRETE = /nvidia|geforce|quadro|rtx|radeon|amd|apple m\d|apple gpu/i;
const DESKTOP_INTEGRATED = /intel|uhd|iris|hd graphics/i;

/** Choisit un niveau à partir des caractéristiques de l'appareil. */
export function detectQuality(d: DeviceInfo): QualityLevel {
  const gpu = d.gpu || '';
  if (SOFTWARE.test(gpu)) return 'low';
  if ((d.memory && d.memory <= 2) || (d.cores && d.cores <= 2)) return 'low';
  if (d.mobile) {
    if (WEAK_MOBILE.test(gpu)) return 'low';
    if (/apple/i.test(gpu)) return d.memory && d.memory <= 3 ? 'medium' : 'high';
    if (MID_MOBILE.test(gpu)) return 'medium';
    if (d.memory && d.memory <= 4) return 'medium';
    return gpu ? 'high' : 'medium';
  }
  if (DESKTOP_DISCRETE.test(gpu)) return 'high';
  if (DESKTOP_INTEGRATED.test(gpu)) return d.screenPx > 1800 ? 'medium' : 'high';
  return 'medium';
}

/** Un cran en dessous (ou le même niveau s'il n'y en a pas). */
export function lower(level: QualityLevel): QualityLevel {
  return LEVELS[Math.max(0, LEVELS.indexOf(level) - 1)];
}

/** Lit une préférence imposée par l'adresse (?q=low|medium|high). */
export function fromQuery(search: string): QualityLevel | null {
  const q = new URLSearchParams(search).get('q');
  return q === 'low' || q === 'medium' || q === 'high' ? q : null;
}
