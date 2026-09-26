/// <reference lib="webworker" />
// Worker de dessin : prépare les faces des planches (couleur + masque) hors du fil principal.
import type { CardData } from '../data/catalog';
import { loadFontsInto } from './fonts';
import { SERIF, drawCardFace } from './textures';

declare const self: DedicatedWorkerGlobalScope & { fonts?: FontFaceSet };

export type FacesRequest = { type: 'init' } | { type: 'face'; id: number; card: CardData; scale: number };
export type FacesResponse =
  | { type: 'ready'; ok: boolean; reason?: string }
  | { type: 'face'; id: number; color: ImageBitmap; mask: ImageBitmap; ms: number }
  | { type: 'error'; id: number; message: string };

/** Copie retournée verticalement : les ImageBitmap ne se retournent pas à l'envoi vers WebGL. */
function flipped(src: OffscreenCanvas): ImageBitmap {
  const out = new OffscreenCanvas(src.width, src.height);
  const c = out.getContext('2d')!;
  c.setTransform(1, 0, 0, -1, 0, src.height);
  c.drawImage(src, 0, 0);
  return out.transferToImageBitmap();
}

async function init(): Promise<FacesResponse> {
  if (typeof OffscreenCanvas === 'undefined') return { type: 'ready', ok: false, reason: 'OffscreenCanvas absent' };
  if (!self.fonts) return { type: 'ready', ok: false, reason: 'polices indisponibles dans les Workers' };
  try { await loadFontsInto(self.fonts); } catch (e) { return { type: 'ready', ok: false, reason: 'chargement des polices : ' + e }; }
  // la police est-elle vraiment utilisée ? (sinon le texte serait dessiné avec une police de secours)
  const c = new OffscreenCanvas(8, 8).getContext('2d')!;
  c.font = `600 60px ${SERIF}`; const a = c.measureText('Carte du Ciel 0123').width;
  c.font = '600 60px serif'; const b = c.measureText('Carte du Ciel 0123').width;
  return Math.abs(a - b) > 0.5 ? { type: 'ready', ok: true } : { type: 'ready', ok: false, reason: 'police non appliquée' };
}

self.onmessage = async (e: MessageEvent<FacesRequest>) => {
  const m = e.data;
  if (m.type === 'init') { self.postMessage(await init()); return; }
  try {
    const t0 = performance.now();
    const face = drawCardFace(m.card, m.scale);
    const color = flipped(face.color), mask = flipped(face.mask);
    const res: FacesResponse = { type: 'face', id: m.id, color, mask, ms: performance.now() - t0 };
    self.postMessage(res, [color, mask]);
  } catch (err) {
    self.postMessage({ type: 'error', id: m.id, message: String(err) } satisfies FacesResponse);
  }
};
