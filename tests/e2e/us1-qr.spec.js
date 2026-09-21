/**
 * Test E2E — US1: Validazione biglietto QR
 *
 * Verifica il comportamento della pagina in risposta all'evento MQTT
 * qr/0/event/read: il messaggio di accesso sopra l'orologio cambia testo/colore
 * e torna automaticamente a quello di default dopo il timeout.
 *
 * I test simulano l'evento MQTT chiamando window.gestisciEvento(topic)
 * direttamente, senza broker reale.
 */

import { test, expect } from '@playwright/test';

const TOPIC_QR = 'qr/0/event/read';
const POPUP_DURATA_MS = 3000;
const MESSAGGIO_IDLE = 'Accesso con titolo di viaggio valido o carta di credito contactless (1,2€)';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.gestisciEvento === 'function');
});

// --- Cambio messaggio ---

test('US1-01: Messaggio successo appare dopo evento QR', async ({ page }) => {
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-esito/);

  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);

  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
});

test('US1-02: Messaggio successo contiene il testo corretto', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);

  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Biglietto valido, accesso autorizzato');
});

test('US1-03: Messaggio successo appare entro 1 secondo dall\'evento', async ({ page }) => {
  const inizio = Date.now();
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
  const elapsed = Date.now() - inizio;

  expect(elapsed).toBeLessThan(1000);
  console.log(`✅ Messaggio cambiato in ${elapsed}ms`);
});

// --- Ripristino automatico ---

test('US1-04: Messaggio successo torna a quello di default dopo il timeout', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);

  // Attendi oltre il timeout configurato
  await page.waitForTimeout(POPUP_DURATA_MS + 500);

  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-esito/);
});

test('US1-05: Dopo il ripristino del messaggio lo stato torna IDLE', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await page.waitForTimeout(POPUP_DURATA_MS + 500);

  await expect(page.locator('#testo-messaggio-accesso')).toHaveText(MESSAGGIO_IDLE);
});

// --- Rinnovo timer ---

test('US1-06: Secondo evento QR durante il messaggio successo rinnova il timer', async ({ page }) => {
  // Primo evento
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);

  // Attendi metà del timeout
  await page.waitForTimeout(POPUP_DURATA_MS / 2);

  // Secondo evento — deve rinnovare il timer
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);

  // Il messaggio deve essere ancora nello stato successo dopo un altro mezzo timeout
  await page.waitForTimeout(POPUP_DURATA_MS / 2 + 200);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);

  // Poi torna a IDLE dopo il timeout completo dal secondo evento
  await page.waitForTimeout(POPUP_DURATA_MS / 2 + 500);
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-esito/);
});

// --- Layout IDLE durante il messaggio successo ---

test('US1-07: Logo e orologio restano visibili durante il messaggio successo', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);

  // Il resto del layout non è un overlay: resta sempre visibile
  await expect(page.locator('#area-logo')).toBeVisible();
  await expect(page.locator('#area-orologio')).toBeVisible();
  await expect(page.locator('#area-messaggio-accesso')).toBeVisible();
});
