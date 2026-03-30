/**
 * Test E2E — US2: Validazione tessera contactless (NFC)
 *
 * Verifica il flusso a due fasi:
 *   cless/0/event/validating → popup "Attendere prego..."
 *   cless/0/event/validated  → popup "Biglietto valido, buon viaggio!"
 *
 * Anche invalid_card porta al popup di successo (comportamento da demo).
 *
 * I test simulano gli eventi MQTT via window.gestisciEvento(topic).
 */

import { test, expect } from '@playwright/test';

const TOPIC_VALIDATING   = 'cless/0/event/validating';
const TOPIC_VALIDATED    = 'cless/0/event/validated';
const TOPIC_INVALID_CARD = 'cless/0/event/invalid_card';
const TOPIC_QR           = 'qr/0/event/read';
const POPUP_DURATA_MS    = 3000;

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.gestisciEvento === 'function');
});

// --- Popup di attesa ---

test('US2-01: Popup attesa appare dopo evento validating', async ({ page }) => {
  await expect(page.locator('#popup-attesa')).not.toBeVisible();

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);

  await expect(page.locator('#popup-attesa')).toBeVisible();
});

test('US2-02: Popup attesa contiene il testo corretto', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);

  await expect(page.locator('#popup-attesa')).toContainText('Attendere prego...');
});

test('US2-03: Popup attesa appare entro 1 secondo dall\'evento', async ({ page }) => {
  const inizio = Date.now();
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#popup-attesa')).toBeVisible();
  const elapsed = Date.now() - inizio;

  expect(elapsed).toBeLessThan(1000);
  console.log(`✅ Popup attesa apparso in ${elapsed}ms`);
});

test('US2-04: Popup attesa non scompare da solo (nessun timer autonomo)', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#popup-attesa')).toBeVisible();

  // Attendi oltre il timeout del popup successo
  await page.waitForTimeout(POPUP_DURATA_MS + 500);

  // Il popup di attesa deve essere ancora visibile
  await expect(page.locator('#popup-attesa')).toBeVisible();
});

test('US2-05: Popup successo non è visibile durante l\'attesa', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#popup-attesa')).toBeVisible();
  await expect(page.locator('#popup-successo')).not.toBeVisible();
});

// --- Transizione validated → successo ---

test('US2-06: Evento validated trasforma popup attesa in successo', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#popup-attesa')).toBeVisible();

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATED);

  await expect(page.locator('#popup-attesa')).not.toBeVisible();
  await expect(page.locator('#popup-successo')).toBeVisible();
  await expect(page.locator('#popup-successo')).toContainText('Biglietto valido, buon viaggio!');
});

test('US2-07: Popup successo dopo validated scompare automaticamente', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATED);

  await expect(page.locator('#popup-successo')).toBeVisible();
  await page.waitForTimeout(POPUP_DURATA_MS + 500);
  await expect(page.locator('#popup-successo')).not.toBeVisible();
});

// --- Transizione invalid_card → successo (comportamento demo) ---

test('US2-08: Evento invalid_card trasforma popup attesa in successo (comportamento demo)', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#popup-attesa')).toBeVisible();

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_INVALID_CARD);

  await expect(page.locator('#popup-attesa')).not.toBeVisible();
  await expect(page.locator('#popup-successo')).toBeVisible();
  await expect(page.locator('#popup-successo')).toContainText('Biglietto valido, buon viaggio!');
});

test('US2-09: Popup successo dopo invalid_card scompare automaticamente', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_INVALID_CARD);

  await expect(page.locator('#popup-successo')).toBeVisible();
  await page.waitForTimeout(POPUP_DURATA_MS + 500);
  await expect(page.locator('#popup-successo')).not.toBeVisible();
});

// --- Interruzione attesa da evento QR ---

test('US2-10: Evento QR durante attesa NFC porta direttamente al popup successo', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#popup-attesa')).toBeVisible();

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);

  await expect(page.locator('#popup-attesa')).not.toBeVisible();
  await expect(page.locator('#popup-successo')).toBeVisible();
});

// --- Sequenza completa ---

test('US2-11: Sequenza completa validating → validated → chiusura → IDLE', async ({ page }) => {
  // Fase 1: carta rilevata
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#popup-attesa')).toBeVisible();
  await expect(page.locator('#popup-successo')).not.toBeVisible();

  // Simula 300ms di attesa
  await page.waitForTimeout(300);

  // Fase 2: validazione completata
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATED);
  await expect(page.locator('#popup-attesa')).not.toBeVisible();
  await expect(page.locator('#popup-successo')).toBeVisible();

  // Fase 3: chiusura automatica
  await page.waitForTimeout(POPUP_DURATA_MS + 500);
  await expect(page.locator('#popup-successo')).not.toBeVisible();

  // Fase 4: IDLE ripristinato
  await expect(page.locator('#area-istruzione')).toContainText('Validare il titolo di viaggio');
});
