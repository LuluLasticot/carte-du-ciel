// Poussière d'étoiles : l'économie locale de la collection (aucun achat).
// Les doublons se convertissent en poussière, la poussière crée une planche manquante,
// et quelques récompenses en donnent aussi. Fonctions pures, testées dans tests/unit/economy.test.ts.
import type { CollectionState } from '../store/collection';
import { CARDS, CONS } from './catalog';

/** Poussière rendue par un doublon, selon la rareté (commune → mythique). */
export const DUST_PER_DUPLICATE = [5, 15, 40, 100, 250] as const;
/** Poussière nécessaire pour créer une planche manquante (8 doublons de même rareté). */
export const CRAFT_COST = [40, 120, 320, 800, 2000] as const;
/** Prime de la première pochette ouverte chaque jour. */
export const DAILY_BONUS = 25;
/** Prime par planche d'une constellation complétée. */
export const CONSTELLATION_BONUS_PER_PLATE = 40;

export interface Reward { kind: 'daily' | 'constellation'; dust: number; key?: string; label: string }

const byNumber = new Map(CARDS.map((c) => [c.n, c]));

/** Planches de chaque constellation (les objets du Système solaire n'en ont pas). */
export const CONSTELLATION_PLATES: Record<string, number[]> = (() => {
  const out: Record<string, number[]> = {};
  for (const c of CARDS) if (c.con) (out[c.con] ||= []).push(c.n);
  return out;
})();

export interface ConstellationStatus { key: string; name: string; plates: number[]; owned: number; complete: boolean }
export function constellationStatus(s: CollectionState): ConstellationStatus[] {
  return Object.entries(CONSTELLATION_PLATES).map(([key, plates]) => {
    const owned = plates.filter((n) => s.cards[n]).length;
    return { key, name: CONS[key].name, plates, owned, complete: owned === plates.length };
  });
}

export function duplicatesValue(s: CollectionState): { copies: number; dust: number } {
  let copies = 0, dust = 0;
  for (const [k, count] of Object.entries(s.cards)) {
    const extra = count - 1;
    if (extra > 0) { copies += extra; dust += extra * DUST_PER_DUPLICATE[byNumber.get(+k)!.tier]; }
  }
  return { copies, dust };
}

/** Convertit tous les doublons : chaque planche garde un seul exemplaire. */
export function convertDuplicates(s: CollectionState): { state: CollectionState; gained: number; copies: number } {
  const { copies, dust } = duplicatesValue(s);
  const cards: Record<number, number> = {};
  for (const k of Object.keys(s.cards)) cards[+k] = 1;
  return { state: { ...s, cards, dust: s.dust + dust }, gained: dust, copies };
}

export function craftCost(n: number): number { return CRAFT_COST[byNumber.get(n)!.tier]; }

export type CraftResult = { ok: true; state: CollectionState } | { ok: false; error: string };
/** Crée une planche manquante contre de la poussière. */
export function craft(s: CollectionState, n: number): CraftResult {
  const card = byNumber.get(n);
  if (!card) return { ok: false, error: 'Planche inconnue.' };
  if (s.cards[n]) return { ok: false, error: 'Cette planche est déjà dans votre collection.' };
  const cost = CRAFT_COST[card.tier];
  if (s.dust < cost) return { ok: false, error: `Il manque ${cost - s.dust} poussières d'étoiles.` };
  return { ok: true, state: { ...s, dust: s.dust - cost, cards: { ...s.cards, [n]: 1 } } };
}

/** Récompense les constellations qui viennent d'être complétées (une seule fois chacune). */
export function grantConstellationRewards(before: CollectionState, after: CollectionState): { state: CollectionState; rewards: Reward[] } {
  const rewards: Reward[] = [];
  const done = new Set(after.rewarded);
  for (const c of constellationStatus(after)) {
    if (!c.complete || done.has(c.key)) continue;
    const wasComplete = c.plates.every((n) => before.cards[n]);
    if (wasComplete && before.rewarded.includes(c.key)) continue;
    const dust = CONSTELLATION_BONUS_PER_PLATE * c.plates.length;
    rewards.push({ kind: 'constellation', dust, key: c.key, label: `Constellation complète : ${c.name}` });
    done.add(c.key);
  }
  const gained = rewards.reduce((a, r) => a + r.dust, 0);
  return { state: { ...after, dust: after.dust + gained, rewarded: [...done] }, rewards };
}

/** Jour local au format AAAA-MM-JJ. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Prime de la première pochette du jour. */
export function grantDaily(s: CollectionState, now: Date): { state: CollectionState; reward: Reward | null } {
  const today = dayKey(now);
  if (s.lastDaily === today) return { state: s, reward: null };
  return {
    state: { ...s, dust: s.dust + DAILY_BONUS, lastDaily: today },
    reward: { kind: 'daily', dust: DAILY_BONUS, label: 'Première observation du jour' },
  };
}
