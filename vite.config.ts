import { defineConfig } from 'vitest/config';
import { serviceWorker } from './tools/sw-plugin';

export default defineConfig({
  plugins: [serviceWorker()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    // Three.js dans son propre fichier : mis en cache indépendamment du code du jeu
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined) },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
