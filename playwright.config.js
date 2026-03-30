/**
 * Playwright Configuration — Test E2E per Demo Validatrice FER
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',

  // Timeout per test singolo
  timeout: 30 * 1000,

  // Configurazione expect
  expect: {
    timeout: 5000
  },

  // Test in parallelo
  fullyParallel: true,

  // Nessun retry in sviluppo, 2 in CI
  retries: process.env.CI ? 2 : 0,

  // Worker: 1 in CI, automatico in locale
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:8080',
    viewport: { width: 600, height: 1024 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Avvia il server HTTP automaticamente prima dei test
  webServer: {
    command: 'python3 -m http.server 8080',
    port: 8080,
    reuseExistingServer: true,
    timeout: 10 * 1000,
  },
});
