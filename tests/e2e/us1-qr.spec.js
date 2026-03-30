/**
 * Test E2E — US1: Validazione biglietto QR
 *
 * Verifica il comportamento della pagina in risposta all'evento MQTT
 * qr/0/event/read: comparsa popup successo e chiusura automatica.
 *
 * I test simulano l'evento MQTT chiamando window.gestisciEvento(topic)
 * direttamente, senza broker reale.
 */

import { test, expect } from '@playwright/test';

const TOPIC_QR = 'qr/0/event/read';
const POPUP_DURATA_MS = 3000;

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.gestisciEvento === 'function');
});

// --- Apparizione popup ---

test('US1-01: Popup successo appare dopo evento QR', async ({ page }) => {
  await expect(page.locator('#popup-successo')).not.toBeVisible();

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);

  await expect(page.locator('#popup-successo')).toBeVisible();
});

test('US1-02: Popup successo contiene il testo corretto', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);

  await expect(page.locator('#popup-successo')).toContainText('Biglietto valido, buon viaggio!');
});

test('US1-03: Popup successo appare entro 1 secondo dall\'evento', async ({ page }) => {
  const inizio = Date.now();
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#popup-successo')).toBeVisible();
  const elapsed = Date.now() - inizio;

  expect(elapsed).toBeLessThan(1000);
  console.log(`✅ Popup apparso in ${elapsed}ms`);
});

// --- Chiusura automatica ---

test('US1-04: Popup successo scompare automaticamente dopo il timeout', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#popup-successo')).toBeVisible();

  // Attendi oltre il timeout configurato
  await page.waitForTimeout(POPUP_DURATA_MS + 500);

  await expect(page.locator('#popup-successo')).not.toBeVisible();
});

test('US1-05: Dopo la chiusura del popup lo stato torna IDLE', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await page.waitForTimeout(POPUP_DURATA_MS + 500);

  // In stato IDLE nessun popup è visibile
  await expect(page.locator('#popup-successo')).not.toBeVisible();
  await expect(page.locator('#popup-attesa')).not.toBeVisible();
});

// --- Rinnovo timer ---

test('US1-06: Secondo evento QR durante popup rinnova il timer', async ({ page }) => {
  // Primo evento
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#popup-successo')).toBeVisible();

  // Attendi metà del timeout
  await page.waitForTimeout(POPUP_DURATA_MS / 2);

  // Secondo evento — deve rinnovare il timer
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);

  // Il popup deve essere ancora visibile dopo un altro mezzo timeout
  await page.waitForTimeout(POPUP_DURATA_MS / 2 + 200);
  await expect(page.locator('#popup-successo')).toBeVisible();

  // Poi scompare dopo il timeout completo dal secondo evento
  await page.waitForTimeout(POPUP_DURATA_MS / 2 + 500);
  await expect(page.locator('#popup-successo')).not.toBeVisible();
});

// --- Layout IDLE durante popup ---

test('US1-07: Layout IDLE rimane in background durante il popup QR', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#popup-successo')).toBeVisible();

  // Il layout IDLE deve rimanere nel DOM (il popup è un overlay)
  await expect(page.locator('#area-logo')).toBeAttached();
  await expect(page.locator('#area-orologio')).toBeAttached();
  await expect(page.locator('#area-istruzione')).toBeAttached();
});
