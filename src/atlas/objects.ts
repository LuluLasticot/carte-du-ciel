// Position de chaque planche sur la sphère céleste : coordonnées fixes pour le ciel profond,
// positions du jour (éphémérides) pour les objets du Système solaire.
import { type BodyKey, bodyPosition } from '../astro/ephemeris';
import { CARDS, type CardData } from '../data/catalog';

/** Planches du Système solaire → corps dont on calcule la position. */
export const SOLAR_BODY: Record<number, BodyKey> = {
  1: 'moon', 2: 'mars', 3: 'venus', 4: 'jupiter', 5: 'saturn', 6: 'ceres', 12: 'halley',
  13: 'jupiter', 14: 'saturn', 15: 'neptune', 20: 'haleBopp',
};
/** Petits décalages (degrés) pour séparer des objets confondus sur la carte : lunes et planète, nébuleuse et pulsar. */
const NUDGE: Record<number, [number, number]> = { 4: [0.9, -0.5], 5: [0.9, -0.5], 30: [0.0, -0.9] };

export interface AtlasObject {
  n: number;
  card: CardData;
  ra: number;   // heures
  dec: number;  // degrés
  solar: boolean;
}

export function atlasObjects(date = new Date()): AtlasObject[] {
  return CARDS.map((card) => {
    const body = SOLAR_BODY[card.n];
    let { ra, dec } = body ? bodyPosition(body, date) : { ra: card.ra!, dec: card.dec! };
    const nudge = NUDGE[card.n];
    if (nudge) { ra += nudge[0] / 15 / Math.max(0.2, Math.cos(dec * Math.PI / 180)); dec += nudge[1]; }
    return { n: card.n, card, ra: ((ra % 24) + 24) % 24, dec, solar: !!body };
  });
}
