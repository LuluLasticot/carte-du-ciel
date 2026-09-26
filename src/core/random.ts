// Aléatoire pur (sans DOM) : utilisable par le jeu comme par les tests unitaires.

export type Rng = () => number;

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tire un indice selon des poids (pas forcément normalisés). */
export function pickWeighted(weights: readonly number[], random: Rng): number {
  const s = weights.reduce((x, y) => x + y, 0);
  let r = random() * s;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return weights.length - 1;
}
