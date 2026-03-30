/**
 * Test E2E — US3: Indicatore stato connessione broker
 *
 * Verifica che l'indicatore visivo rifletta correttamente lo stato della
 * connessione MQTT (connesso / in riconnessione / disconnesso).
 *
 * I test simulano i cambi di stato chiamando window.aggiornaStatoConnessione(stato).
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.aggiornaStatoConnessione === 'function');
});

// --- Presenza elemento ---

test('US3-01: Indicatore di connessione è presente nel DOM', async ({ page }) => {
  await expect(page.locator('#indicatore-connessione')).toBeAttached();
});

test('US3-02: Indicatore di connessione è sempre visibile (anche durante i popup)', async ({ page }) => {
  await expect(page.locator('#indicatore-connessione')).toBeVisible();

  // Rimane visibile anche con popup attivo
  await page.waitForFunction(() => typeof window.gestisciEvento === 'function');
  await page.evaluate(() => window.gestisciEvento('qr/0/event/read'));
  await expect(page.locator('#popup-successo')).toBeVisible();
  await expect(page.locator('#indicatore-connessione')).toBeVisible();
});

// --- Stato connected ---

test('US3-03: Stato connected mostra etichetta "Connesso"', async ({ page }) => {
  await page.evaluate(() => window.aggiornaStatoConnessione('connected'));

  await expect(page.locator('#indicatore-connessione')).toContainText('Connesso');
});

test('US3-04: Stato connected applica la classe CSS corretta', async ({ page }) => {
  await page.evaluate(() => window.aggiornaStatoConnessione('connected'));

  await expect(page.locator('#indicatore-connessione')).toHaveClass(/connected/);
});

// --- Stato reconnecting ---

test('US3-05: Stato reconnecting mostra etichetta "In riconnessione"', async ({ page }) => {
  await page.evaluate(() => window.aggiornaStatoConnessione('reconnecting'));

  await expect(page.locator('#indicatore-connessione')).toContainText('In riconnessione');
});

test('US3-06: Stato reconnecting applica la classe CSS corretta', async ({ page }) => {
  await page.evaluate(() => window.aggiornaStatoConnessione('reconnecting'));

  await expect(page.locator('#indicatore-connessione')).toHaveClass(/reconnecting/);
});

// --- Stato disconnected ---

test('US3-07: Stato disconnected mostra etichetta "Disconnesso"', async ({ page }) => {
  await page.evaluate(() => window.aggiornaStatoConnessione('disconnected'));

  await expect(page.locator('#indicatore-connessione')).toContainText('Disconnesso');
});

test('US3-08: Stato disconnected applica la classe CSS corretta', async ({ page }) => {
  await page.evaluate(() => window.aggiornaStatoConnessione('disconnected'));

  await expect(page.locator('#indicatore-connessione')).toHaveClass(/disconnected/);
});

// --- Transizioni ---

test('US3-09: Transizione connected → disconnected aggiorna indicatore', async ({ page }) => {
  await page.evaluate(() => window.aggiornaStatoConnessione('connected'));
  await expect(page.locator('#indicatore-connessione')).toContainText('Connesso');

  await page.evaluate(() => window.aggiornaStatoConnessione('disconnected'));
  await expect(page.locator('#indicatore-connessione')).toContainText('Disconnesso');
  await expect(page.locator('#indicatore-connessione')).not.toContainText('Connesso');
});

test('US3-10: Transizione disconnected → reconnecting → connected', async ({ page }) => {
  await page.evaluate(() => window.aggiornaStatoConnessione('disconnected'));
  await expect(page.locator('#indicatore-connessione')).toHaveClass(/disconnected/);

  await page.evaluate(() => window.aggiornaStatoConnessione('reconnecting'));
  await expect(page.locator('#indicatore-connessione')).toHaveClass(/reconnecting/);
  await expect(page.locator('#indicatore-connessione')).not.toHaveClass(/disconnected/);

  await page.evaluate(() => window.aggiornaStatoConnessione('connected'));
  await expect(page.locator('#indicatore-connessione')).toHaveClass(/connected/);
  await expect(page.locator('#indicatore-connessione')).not.toHaveClass(/reconnecting/);
});

// --- Posizione ---

test('US3-11: Indicatore è posizionato in alto a destra (fixed)', async ({ page }) => {
  const position = await page.evaluate(() => {
    const el = document.getElementById('indicatore-connessione');
    const style = window.getComputedStyle(el);
    return {
      position: style.position,
      top: parseInt(style.top),
      right: parseInt(style.right),
    };
  });

  expect(position.position).toBe('fixed');
  expect(position.top).toBeLessThanOrEqual(20);
  expect(position.right).toBeLessThanOrEqual(20);
});
