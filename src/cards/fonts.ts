// Déclare les polices du jeu dans un contexte donné (document ou Worker) à partir de fonts.css,
// pour que les faces dessinées hors du fil principal utilisent exactement les mêmes fichiers.
import css from '../assets/fonts/fonts.css?raw';

const files = import.meta.glob('../assets/fonts/*.woff2', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

export interface FaceSpec { family: string; source: string; descriptors: FontFaceDescriptors }

export function fontSpecs(): FaceSpec[] {
  const specs: FaceSpec[] = [];
  for (const block of css.match(/@font-face\s*\{[^}]*\}/g) || []) {
    const get = (k: string) => (new RegExp(`${k}\\s*:\\s*([^;}]+)`).exec(block)?.[1] || '').trim();
    const file = /url\('\.\/([^']+)'\)/.exec(block)?.[1];
    const url = file && files[`../assets/fonts/${file}`];
    if (!url) continue;
    specs.push({
      family: get('font-family').replace(/['"]/g, ''),
      source: `url(${url})`,
      descriptors: { style: get('font-style') || 'normal', weight: get('font-weight') || 'normal', stretch: get('font-stretch') || 'normal', unicodeRange: get('unicode-range') || undefined, display: 'block' },
    });
  }
  return specs;
}

/** Charge toutes les polices dans un FontFaceSet (document.fonts ou self.fonts). */
export async function loadFontsInto(set: FontFaceSet): Promise<void> {
  await Promise.all(fontSpecs().map(async (s) => {
    const f = new FontFace(s.family, s.source, s.descriptors);
    set.add(f);
    await f.load();
  }));
}
