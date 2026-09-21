/**
 * Test E2E — US2: Validazione tessera contactless (NFC)
 *
 * Verifica il flusso a due fasi sul messaggio di accesso sopra l'orologio:
 *   cless/0/event/validating → messaggio "Attendere prego..." (blu)
 *   cless/0/event/validated  → messaggio "Biglietto valido, accesso autorizzato" (verde)
 *
 * Anche invalid_card porta al messaggio di successo (comportamento da demo).
 *
 * I test simulano gli eventi MQTT via window.gestisciEvento(topic).
 */

import { test, expect } from '@playwright/test';

const TOPIC_VALIDATING   = 'cless/0/event/validating';
const TOPIC_VALIDATED    = 'cless/0/event/validated';
const TOPIC_INVALID_CARD = 'cless/0/event/invalid_card';
const TOPIC_QR           = 'qr/0/event/read';
const POPUP_DURATA_MS    = 3000;
const MESSAGGIO_IDLE = 'Accesso con titolo di viaggio valido o carta di credito contactless (1,2€)';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.gestisciEvento === 'function');
});

// --- Messaggio di attesa ---

test('US2-01: Messaggio attesa appare dopo evento validating', async ({ page }) => {
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-attesa/);

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);

  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);
});

test('US2-02: Messaggio attesa contiene il testo corretto', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);

  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Attendere prego...');
});

test('US2-03: Messaggio attesa appare entro 1 secondo dall\'evento', async ({ page }) => {
  const inizio = Date.now();
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);
  const elapsed = Date.now() - inizio;

  expect(elapsed).toBeLessThan(1000);
  console.log(`✅ Messaggio attesa apparso in ${elapsed}ms`);
});

test('US2-04: Messaggio attesa non scompare da solo (nessun timer autonomo)', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);

  // Attendi oltre il timeout del messaggio successo
  await page.waitForTimeout(POPUP_DURATA_MS + 500);

  // Il messaggio di attesa deve essere ancora presente
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);
});

test('US2-05: Messaggio successo non è attivo durante l\'attesa', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-esito/);
});

// --- Transizione validated → successo ---

test('US2-06: Evento validated trasforma messaggio attesa in successo', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATED);

  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-attesa/);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Biglietto valido, accesso autorizzato');
});

test('US2-07: Messaggio successo dopo validated torna a IDLE automaticamente', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATED);

  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
  await page.waitForTimeout(POPUP_DURATA_MS + 500);
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-esito/);
});

// --- Transizione invalid_card → successo (comportamento demo) ---

test('US2-08: Evento invalid_card trasforma messaggio attesa in successo (comportamento demo)', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_INVALID_CARD);

  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-attesa/);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Biglietto valido, accesso autorizzato');
});

test('US2-09: Messaggio successo dopo invalid_card torna a IDLE automaticamente', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_INVALID_CARD);

  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
  await page.waitForTimeout(POPUP_DURATA_MS + 500);
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-esito/);
});

// --- Interruzione attesa da evento QR ---

test('US2-10: Evento QR durante attesa NFC porta direttamente al messaggio successo', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);

  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-attesa/);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
});

// --- Sequenza completa ---

test('US2-11: Sequenza completa validating → validated → ripristino → IDLE', async ({ page }) => {
  // Fase 1: carta rilevata
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-esito/);

  // Simula 300ms di attesa
  await page.waitForTimeout(300);

  // Fase 2: validazione completata
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATED);
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-attesa/);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);

  // Fase 3: ripristino automatico
  await page.waitForTimeout(POPUP_DURATA_MS + 500);
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-esito/);

  // Fase 4: IDLE ripristinato
  await expect(page.locator('#testo-messaggio-accesso')).toHaveText(MESSAGGIO_IDLE);
});
