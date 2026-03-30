/**
 * Test E2E — Layout IDLE
 *
 * Verifica che la pagina mostri correttamente logo, orologio e istruzione
 * quando non ci sono eventi MQTT in corso.
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Attendi che app.js sia inizializzato
  await page.waitForFunction(() => typeof window.gestisciEvento === 'function');
});

// --- Logo ---

test('Logo FER è visibile nella pagina', async ({ page }) => {
  const logo = page.locator('#area-logo img');
  await expect(logo).toBeVisible();
});

test('Logo FER ha src corretto', async ({ page }) => {
  const logo = page.locator('#area-logo img');
  await expect(logo).toHaveAttribute('src', /logoFER\.svg/);
});

// --- Orologio ---

test('Area orologio è visibile', async ({ page }) => {
  await expect(page.locator('#area-orologio')).toBeVisible();
});

test('Data è visualizzata in formato DD/MM/YYYY', async ({ page }) => {
  const data = page.locator('#orologio-data');
  await expect(data).toBeVisible();
  // Formato atteso: due cifre / due cifre / quattro cifre
  await expect(data).toHaveText(/^\d{2}\/\d{2}\/\d{4}$/);
});

test('Ora è visualizzata in formato HH:MM:SS', async ({ page }) => {
  const ora = page.locator('#orologio-ora');
  await expect(ora).toBeVisible();
  await expect(ora).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
});

test('Orologio si aggiorna ogni secondo', async ({ page }) => {
  const ora1 = await page.locator('#orologio-ora').textContent();
  await page.waitForTimeout(1500);
  const ora2 = await page.locator('#orologio-ora').textContent();
  expect(ora1).not.toEqual(ora2);
});

// --- Istruzione ---

test('Testo istruzione è visibile', async ({ page }) => {
  await expect(page.locator('#area-istruzione')).toBeVisible();
  await expect(page.locator('#area-istruzione')).toContainText('Validare il titolo di viaggio');
});

// --- Layout generale ---

test('Nessun popup è visibile in stato IDLE', async ({ page }) => {
  await expect(page.locator('#popup-successo')).not.toBeVisible();
  await expect(page.locator('#popup-attesa')).not.toBeVisible();
});

test('La pagina non ha scrollbar (overflow hidden)', async ({ page }) => {
  const { scrollWidth, clientWidth, scrollHeight, clientHeight } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
});

test('Il body ha larghezza 600px', async ({ page }) => {
  const width = await page.evaluate(() => document.body.offsetWidth);
  expect(width).toBe(600);
});

test('Il body ha altezza 1024px', async ({ page }) => {
  const height = await page.evaluate(() => document.body.offsetHeight);
  expect(height).toBe(1024);
});
