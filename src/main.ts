// ---------------------------------------------------------------------------
// Point d'entrée : vérifie que l'appareil sait afficher la scène 3D, puis charge
// l'application complète, ou la page de repli qui présente les planches en images.
// ---------------------------------------------------------------------------
import './styles/main.css';

/** WebGL 2 avec rendu en virgule flottante (nécessaire au pipeline HDR). */
export function webglSupport(): { ok: boolean; reason: string } {
  if (new URLSearchParams(location.search).has('fallback')) return { ok: false, reason: 'forcé par l’adresse' };
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return { ok: false, reason: 'WebGL 2 indisponible' };
    const hdr = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return hdr ? { ok: true, reason: '' } : { ok: false, reason: 'rendu en virgule flottante indisponible' };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

const support = webglSupport();
if (support.ok) {
  import('./app').catch((err) => {
    console.error(err);
    const msg = document.getElementById('loadMsg');
    if (msg) msg.textContent = 'Une erreur empêche le chargement de la scène 3D. Rechargez la page.';
  });
} else {
  import('./fallback').then((m) => m.showFallback(support.reason));
}

// application installable et utilisable hors ligne (site publié uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator && !new URLSearchParams(location.search).has('nosw')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* hors ligne indisponible */ }); });
}
