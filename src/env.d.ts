/// <reference types="vite/client" />

// Globales exposées pour le débogage et les tests (voir main.ts)
interface Window {
  CDC: any;
  __parts: any;
  CDC_NO_DYN?: boolean;
  webkitAudioContext?: typeof AudioContext;
}
