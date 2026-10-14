/**
 * Test E2E — Pagamento con carta di credito rifiutato (cless/0/event/huntfail).
 *
 * Il driver manda huntend e subito dopo huntfail, con il motivo leggibile in
 * data.description (es. "Card refused: antipassback"): la pagina lo mostra in
 * rosso per popupDurationMs, poi torna in IDLE e rimette il POS in hunt una sola volta.
 */

import { test, expect } from '@playwright/test';

const TOPIC_HUNTFAIL   = 'cless/0/event/huntfail';
const TOPIC_HUNTEND    = 'cless/0/event/huntend';
const TOPIC_VALIDATING = 'cless/0/event/validating';
const COMANDO_HUNT  = 'cless/0/command/hunt';
const COMANDO_CLOSE = 'cless/0/command/close';
const POPUP_DURATA_MS = 3000;
const MESSAGGIO_IDLE = 'Accesso con titolo di viaggio valido o carta di credito contactless (1,2€)';

// payload reale visto sul validatore 23
const payloadHuntFail = (data) => JSON.stringify({ timestamp: '20261014153103', data: data });
const ANTIPASSBACK = {
  reason: '71', description: 'Card refused: antipassback',
  transactionid: '2c829a33030b0ce0c78e8f817e4635e0', truncatedpan: '478858******0310   ', posid: '99981451'
};

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.gestisciEvento === 'function' && !!window.mqttClient);
  await page.evaluate(() => {
    window.__publishCalls = [];
    window.mqttClient.publish = function (topic, payload, opts, callback) {
      window.__publishCalls.push({ topic: topic, payload: payload });
      if (typeof callback === 'function') callback();
    };
  });
});

async function evento(page, topic, payload) {
  await page.evaluate(({ t, p }) => window.gestisciEvento(t, p), { t: topic, p: payload });
}

const messaggio = (page) => page.locator('#testo-messaggio-accesso');

test('US7-01: huntfail mostra in rosso la description del driver', async ({ page }) => {
  await evento(page, TOPIC_HUNTFAIL, payloadHuntFail(ANTIPASSBACK));
  await expect(messaggio(page)).toHaveText('Card refused: antipassback');
  await expect(messaggio(page)).toHaveClass(/messaggio-errore/);
});

test('US7-02: huntfail senza description mostra un messaggio generico', async ({ page }) => {
  await evento(page, TOPIC_HUNTFAIL, payloadHuntFail({ reason: '75' }));
  await expect(messaggio(page)).toHaveText('Pagamento non riuscito');
  await expect(messaggio(page)).toHaveClass(/messaggio-errore/);
});

test('US7-03: huntfail durante l\'attesa NFC prevale', async ({ page }) => {
  await evento(page, TOPIC_VALIDATING, JSON.stringify({ timestamp: '20261014153103', data: {} }));
  await evento(page, TOPIC_HUNTFAIL, payloadHuntFail(ANTIPASSBACK));
  await expect(messaggio(page)).toHaveText('Card refused: antipassback');
});

test('US7-04: dopo popupDurationMs torna in IDLE, senza close', async ({ page }) => {
  await evento(page, TOPIC_HUNTFAIL, payloadHuntFail(ANTIPASSBACK));
  await page.waitForTimeout(POPUP_DURATA_MS + 300);
  await expect(messaggio(page)).toHaveText(MESSAGGIO_IDLE);
  await expect(messaggio(page)).not.toHaveClass(/messaggio-errore/);
  const topics = (await page.evaluate(() => window.__publishCalls)).map((c) => c.topic);
  expect(topics).not.toContain(COMANDO_CLOSE);
});

test('US7-05: huntend + huntfail insieme producono un solo hunt al ritorno in IDLE', async ({ page }) => {
  await evento(page, TOPIC_HUNTEND, JSON.stringify({ timestamp: '20261014153103', data: {} }));
  await evento(page, TOPIC_HUNTFAIL, payloadHuntFail(ANTIPASSBACK));
  await page.waitForTimeout(POPUP_DURATA_MS + 1000);
  const hunt = (await page.evaluate(() => window.__publishCalls)).filter((c) => c.topic === COMANDO_HUNT);
  expect(hunt).toHaveLength(1);
});
