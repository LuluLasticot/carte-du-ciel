// Collection du joueur : planches obtenues (numéro → nombre d'exemplaires) et pochettes ouvertes.
// Stockée dans IndexedDB, avec une copie de secours dans localStorage (navigation privée, IndexedDB bloquée).
import { CONS } from '../data/catalog';
import { type Reward, grantConstellationRewards, grantDaily } from '../data/economy';
import { idbGet, idbSet } from './idb';
import { store } from './storage';

export interface CollectionState {
  /** numéro de planche → exemplaires obtenus */
  cards: Record<number, number>;
  /** pochettes ouvertes depuis le début */
  packs: number;
  /** poussière d'étoiles : se gagne avec les doublons et les récompenses, sert à créer une planche manquante */
  dust: number;
  /** dernier jour (AAAA-MM-JJ, heure locale) où la prime de première pochette a été versée */
  lastDaily: string;
  /** constellations complètes déjà récompensées */
  rewarded: string[];
}

export const TOTAL_PLATES = 32;
const IDB_KEY = 'collection';
const LS_KEY = 'cdc.collection';
const LEGACY_KEY = 'cdc.col';
export const EXPORT_FORMAT = 'carte-du-ciel/collection';
export const EXPORT_VERSION = 1;

export function emptyCollection(): CollectionState { return { cards: {}, packs: 0, dust: 0, lastDaily: '', rewarded: [] }; }

/** Nettoie un objet de planches venu d'ailleurs (fichier, ancienne version). */
function sanitizeCards(raw: unknown): Record<number, number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(k), c = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > TOTAL_PLATES) return null;
    if (!Number.isInteger(c) || c < 0 || c > 1e6) return null;
    if (c > 0) out[n] = c;
  }
  return out;
}

export function normalize(raw: unknown): CollectionState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<CollectionState>;
  const cards = sanitizeCards(r.cards);
  if (!cards) return null;
  const packs = Number.isInteger(r.packs) && (r.packs as number) >= 0 ? (r.packs as number) : estimatePacks(cards);
  if (r.dust !== undefined && !(Number.isInteger(r.dust) && (r.dust as number) >= 0 && (r.dust as number) <= 1e9)) return null;
  if (r.rewarded !== undefined && !(Array.isArray(r.rewarded) && r.rewarded.every((k) => typeof k === 'string' && k in CONS))) return null;
  const lastDaily = typeof r.lastDaily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.lastDaily) ? r.lastDaily : '';
  return { cards, packs: Math.max(packs, estimatePacks(cards)), dust: (r.dust as number) || 0, lastDaily, rewarded: [...new Set(r.rewarded || [])] };
}

/** Une pochette donne 5 planches : minimum de pochettes compatible avec la collection. */
export function estimatePacks(cards: Record<number, number>): number {
  const total = Object.values(cards).reduce((a, b) => a + b, 0);
  return Math.ceil(total / 5);
}

/** Ancien format du prototype (localStorage « cdc.col » = { numéro: exemplaires }). */
export function migrateLegacy(raw: unknown): CollectionState | null {
  const cards = sanitizeCards(raw);
  return cards && Object.keys(cards).length ? { ...emptyCollection(), cards, packs: estimatePacks(cards) } : null;
}

export function ownedCount(s: CollectionState): number { return Object.keys(s.cards).length; }
export function copiesCount(s: CollectionState): number { return Object.values(s.cards).reduce((a, b) => a + b, 0); }

// --------------------------- export / import ---------------------------
export function serialize(s: CollectionState, now = new Date()): string {
  return JSON.stringify({
    format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(),
    packs: s.packs, dust: s.dust, lastDaily: s.lastDaily, rewarded: s.rewarded, cards: s.cards,
  }, null, 2);
}

export type ImportResult = { ok: true; state: CollectionState } | { ok: false; error: string };

export function parseExport(text: string): ImportResult {
  let data: any;
  try { data = JSON.parse(text); } catch (e) { return { ok: false, error: "Ce fichier n'est pas une sauvegarde lisible (JSON invalide)." }; }
  if (!data || data.format !== EXPORT_FORMAT) return { ok: false, error: "Ce fichier n'est pas une sauvegarde de Carte du Ciel." };
  if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) return { ok: false, error: 'Cette sauvegarde vient d’une version plus récente du jeu.' };
  const state = normalize({ cards: data.cards, packs: data.packs, dust: data.dust, lastDaily: data.lastDaily, rewarded: data.rewarded });
  if (!state) return { ok: false, error: 'La sauvegarde contient des planches inconnues ou des valeurs invalides.' };
  return { ok: true, state };
}

export function exportFileName(now = new Date()): string {
  return `carte-du-ciel-collection-${now.toISOString().slice(0, 10)}.json`;
}

// --------------------------- état et persistance ---------------------------
export const collection: CollectionState = emptyCollection();
let idbOk = true;

/** Charge la collection (IndexedDB, sinon copie locale, sinon ancien format). */
export async function loadCollection(): Promise<CollectionState> {
  let state: CollectionState | null = null;
  try { state = normalize(await idbGet(IDB_KEY)); } catch (e) { idbOk = false; }
  state ??= normalize(store.get(LS_KEY, null));
  state ??= migrateLegacy(store.get(LEGACY_KEY, null));
  Object.assign(collection, state || emptyCollection());
  if (state) void saveCollection();
  return collection;
}

let pending: Promise<void> = Promise.resolve();
/** Enregistre la collection (les écritures sont mises en file pour garder l'ordre). */
export function saveCollection(): Promise<void> {
  const snapshot: CollectionState = { ...collection, cards: { ...collection.cards }, rewarded: [...collection.rewarded] };
  store.set(LS_KEY, snapshot);
  if (!idbOk) return Promise.resolve();
  pending = pending.then(() => idbSet(IDB_KEY, snapshot)).catch(() => { idbOk = false; });
  return pending;
}

/** Applique un nouvel état (issu des fonctions pures d'economy.ts) et l'enregistre. */
export function commit(next: CollectionState) {
  Object.assign(collection, next);
  return saveCollection();
}

/** Ajoute une planche ; renvoie si elle est nouvelle et les récompenses débloquées. */
export function addCard(n: number): { isNew: boolean; rewards: Reward[] } {
  const isNew = !collection.cards[n];
  const before = collection;
  const next = { ...collection, cards: { ...collection.cards, [n]: (collection.cards[n] || 0) + 1 } };
  const { state, rewards } = grantConstellationRewards(before, next);
  void commit(state);
  return { isNew, rewards };
}

/** Compte une pochette ouverte ; renvoie la prime du jour si c'est la première. */
export function countPack(now = new Date()): Reward | null {
  const { state, reward } = grantDaily({ ...collection, packs: collection.packs + 1 }, now);
  void commit(state);
  return reward;
}

export function replaceCollection(state: CollectionState) {
  return commit({ ...emptyCollection(), ...state, cards: { ...state.cards }, rewarded: [...state.rewarded] });
}

/** Demande au navigateur de ne pas effacer les données du site sous pression d'espace. */
export function requestPersistence() {
  try { void navigator.storage?.persist?.(); } catch (e) { /* ignoré */ }
}
