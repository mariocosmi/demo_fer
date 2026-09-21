/**
 * Test E2E — US4 (002-pagamento-carta-credito): Pagamento con carta di credito
 * contactless.
 *
 * Verifica il flusso:
 *   cless/0/event/huntok (con transactionid) → popup "Addebitati 1,2€, benvenuto"
 *   → pubblicazione cless/0/command/close con lo stesso transactionid
 *
 * Non essendo disponibile un broker MQTT reale durante i test E2E (vedi
 * playwright.config.js), il client MQTT viene sostituito con uno spy su
 * `window.mqttClient.publish`, esposto da js/app.js solo a scopo di test.
 * Gli eventi vengono simulati chiamando direttamente window.gestisciEvento(topic, payload).
 */

import { test, expect } from '@playwright/test';

const TOPIC_HUNTOK     = 'cless/0/event/huntok';
const TOPIC_VALIDATING = 'cless/0/event/validating';
const TOPIC_QR         = 'qr/0/event/read';
const COMANDO_CLOSE    = 'cless/0/command/close';
const POPUP_DURATA_MS  = 3000;

function payloadHuntOk(transactionId) {
  return JSON.stringify({
    timestamp: '2026-09-18T12:00:00Z',
    data: transactionId ? { transactionid: transactionId } : {}
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.gestisciEvento === 'function' && !!window.mqttClient);

  // Sostituisce publish con uno spy che registra le chiamate, senza broker reale.
  await page.evaluate(() => {
    window.__publishCalls = [];
    window.mqttClient.publish = function (topic, payload, opts, callback) {
      window.__publishCalls.push({ topic: topic, payload: payload });
      if (typeof callback === 'function') callback();
    };
  });
});

async function getPublishCalls(page) {
  return page.evaluate(() => window.__publishCalls);
}

// --- Popup di pagamento ---

test('US4-01: Popup pagamento appare dopo evento huntok', async ({ page }) => {
  await expect(page.locator('#popup-pagamento')).not.toBeVisible();

  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  await expect(page.locator('#popup-pagamento')).toBeVisible();
});

test('US4-02: Popup pagamento contiene il testo corretto', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  await expect(page.locator('#popup-pagamento')).toContainText('Addebitati 1,2€, benvenuto');
});

test('US4-03: Popup pagamento appare entro 1 secondo dall\'evento', async ({ page }) => {
  const inizio = Date.now();
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );
  await expect(page.locator('#popup-pagamento')).toBeVisible();
  const elapsed = Date.now() - inizio;

  expect(elapsed).toBeLessThan(1000);
});

test('US4-04: Popup pagamento si chiude automaticamente', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );
  await expect(page.locator('#popup-pagamento')).toBeVisible();

  await page.waitForTimeout(POPUP_DURATA_MS + 500);
  await expect(page.locator('#popup-pagamento')).not.toBeVisible();
});

test('US4-05: Un nuovo evento huntok rinnova il timer del popup', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );
  await expect(page.locator('#popup-pagamento')).toBeVisible();

  await page.waitForTimeout(POPUP_DURATA_MS - 500);
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0002') }
  );

  // Se il timer non fosse stato rinnovato, a questo punto sarebbe già scomparso
  await page.waitForTimeout(700);
  await expect(page.locator('#popup-pagamento')).toBeVisible();
});

// --- Sovrascrittura di altri popup ---

test('US4-06: Evento huntok durante attesa NFC porta direttamente al popup pagamento', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#popup-attesa')).toBeVisible();

  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  await expect(page.locator('#popup-attesa')).not.toBeVisible();
  await expect(page.locator('#popup-pagamento')).toBeVisible();
});

test('US4-07: Evento huntok dopo popup successo (QR) sostituisce il popup', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#popup-successo')).toBeVisible();

  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  await expect(page.locator('#popup-successo')).not.toBeVisible();
  await expect(page.locator('#popup-pagamento')).toBeVisible();
});

// --- Correlazione transactionid sul comando di chiusura ---

test('US4-08: huntok con transactionid pubblica cless/0/command/close con lo stesso id', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  const chiamate = await getPublishCalls(page);
  expect(chiamate).toHaveLength(1);
  expect(chiamate[0].topic).toBe(COMANDO_CLOSE);

  const corpo = JSON.parse(chiamate[0].payload);
  expect(corpo.data.transactionid).toBe('TX-0001');
});

test('US4-09: due eventi huntok con transactionid diversi producono due close corrispondenti', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0002') }
  );

  const chiamate = await getPublishCalls(page);
  expect(chiamate).toHaveLength(2);
  expect(JSON.parse(chiamate[0].payload).data.transactionid).toBe('TX-0001');
  expect(JSON.parse(chiamate[1].payload).data.transactionid).toBe('TX-0002');
});

test('US4-10: huntok senza transactionid NON pubblica il comando close ma mostra comunque il popup', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk(null) }
  );

  await expect(page.locator('#popup-pagamento')).toBeVisible();

  const chiamate = await getPublishCalls(page);
  expect(chiamate).toHaveLength(0);
});
