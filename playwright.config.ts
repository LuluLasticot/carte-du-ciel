import { defineConfig, devices } from '@playwright/test';

// Tests visuels : parcours complet d'une ouverture, rendu WebGL logiciel (SwiftShader).
// Les images de référence dépendent du système (rendu des polices) : celles du dépôt sont
// générées sous Linux, comme en CI. Sur macOS, créez les vôtres avec `npm run test:visual:update`.
const swiftshader = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: 'tests/visual',
  timeout: 10 * 60_000,
  expect: { timeout: 120_000, toHaveScreenshot: { maxDiffPixelRatio: 0.015, threshold: 0.25, animations: 'disabled', stylePath: './tests/visual/screenshot.css' } },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { args: swiftshader },
    trace: 'retain-on-failure',
    actionTimeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
