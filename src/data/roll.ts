// Tirage du contenu d'une pochette : 4 planches triées par rareté, puis la plus rare en dernier.
import { type Rng, pickWeighted } from '../core/random';
import { CARDS, PACKS, type CardData } from './catalog';

export interface RollOptions {
  random: Rng;
  /** première pochette Standard du joueur : la dernière planche est au moins légendaire */
  first?: boolean;
  /** rareté imposée pour la dernière planche (ancres #epique, #legendaire, #mythique), -1 sinon */
  force?: number;
}

export function rollPack(type: number, { random, first = false, force = -1 }: RollOptions, cards: readonly CardData[] = CARDS): CardData[] {
  const P = PACKS[type];
  const used = new Set<number>();
  const pick = (t: number) => {
    const pool = cards.filter((c) => c.tier === t && !used.has(c.n));
    const c = pool[Math.floor(random() * pool.length)];
    used.add(c.n);
    return c;
  };
  let lastT = pickWeighted(P.last, random);
  if (first && type === 0) lastT = 3;
  if (force >= 0) lastT = Math.max(force, 2);
  const last = pick(lastT);
  const others: CardData[] = [];
  for (let i = 0; i < 4; i++) others.push(pick(Math.min(pickWeighted(P.slot, random), lastT)));
  others.sort((a, b) => a.tier - b.tier || a.n - b.n);
  return [...others, last];
}
