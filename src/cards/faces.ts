// Préparation des faces de planches dans un Worker, avec repli sur le fil principal.
import type { CardData } from '../data/catalog';
import type { FacesRequest, FacesResponse } from './faces.worker';

export interface FaceBitmaps { color: ImageBitmap; mask: ImageBitmap }

let worker: Worker | null = null;
let ready: Promise<boolean> | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve: (f: FaceBitmaps) => void; reject: (e: Error) => void }>();
export const facesInfo = { mode: 'main' as 'worker' | 'main', reason: '', lastMs: 0 };

function start(): Promise<boolean> {
  if (ready) return ready;
  ready = new Promise<boolean>((resolve) => {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || new URLSearchParams(location.search).has('noworker')) {
      facesInfo.reason = 'non pris en charge'; return resolve(false);
    }
    try {
      worker = new Worker(new URL('./faces.worker.ts', import.meta.url), { type: 'module', name: 'faces' });
    } catch (e) { facesInfo.reason = String(e); return resolve(false); }
    const timer = setTimeout(() => { facesInfo.reason = 'délai dépassé'; resolve(false); }, 8000);
    worker.onerror = () => { clearTimeout(timer); facesInfo.reason = 'erreur du Worker'; resolve(false); };
    worker.onmessage = (e: MessageEvent<FacesResponse>) => {
      const m = e.data;
      if (m.type === 'ready') { clearTimeout(timer); facesInfo.reason = m.reason || ''; resolve(m.ok); return; }
      const w = waiting.get(m.id);
      if (!w) return;
      waiting.delete(m.id);
      if (m.type === 'face') { facesInfo.lastMs = m.ms; w.resolve({ color: m.color, mask: m.mask }); }
      else w.reject(new Error(m.message));
    };
    worker.postMessage({ type: 'init' } satisfies FacesRequest);
  }).then((ok) => {
    facesInfo.mode = ok ? 'worker' : 'main';
    if (!ok) { worker?.terminate(); worker = null; }
    return ok;
  });
  return ready;
}

/** Lance le Worker en avance (pendant le chargement des polices). */
export function warmFaces() { void start(); }

/** Dessine les faces demandées dans le Worker ; null si le Worker n'est pas utilisable. */
export async function renderFaces(cards: CardData[], scale: number): Promise<FaceBitmaps[] | null> {
  if (!(await start()) || !worker) return null;
  try {
    return await Promise.all(cards.map((card) => new Promise<FaceBitmaps>((resolve, reject) => {
      const id = nextId++;
      waiting.set(id, { resolve, reject });
      worker!.postMessage({ type: 'face', id, card, scale } satisfies FacesRequest);
    })));
  } catch (e) {
    console.warn('[faces] repli sur le fil principal :', e);
    return null;
  }
}
