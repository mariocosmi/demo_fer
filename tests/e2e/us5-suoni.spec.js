/**
 * Test E2E — Suoni degli esiti.
 *
 * Quando mostra un esito, la pagina pubblica audio/0/command/play con il file
 * (config.audio): sound_ok per QR letto, NFC validato e pagamento autorizzato,
 * sound_ko per carta non valida. Il suono lo riproduce emotikiosk sul validatore,
 * perché WebKit in cog blocca l'audio senza un tocco sullo schermo.
 *
 * Come in us4, publish è sostituito da uno spy ed eventi simulati con
 * window.gestisciEvento(topic, payload).
 */

import { test, expect } from '@playwright/test';

const COMANDO_PLAY = 'audio/0/command/play';
const PAGAMENTO_IN_CORSO_MS = 500;

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

async function suoni(page) {
  const chiamate = await page.evaluate(() => window.__publishCalls);
  return chiamate
    .filter((c) => c.topic === COMANDO_PLAY)
    .map((c) => JSON.parse(c.payload).data.file);
}

async function evento(page, topic, payload) {
  await page.evaluate(({ topic, payload }) => window.gestisciEvento(topic, payload), { topic, payload: payload || '{}' });
}

test('US5-01: QR letto riproduce sound_ok', async ({ page }) => {
  await evento(page, 'qr/0/event/read');
  expect(await suoni(page)).toEqual(['sound_ok.wav']);
});

test('US5-02: NFC validato riproduce sound_ok, non al validating', async ({ page }) => {
  await evento(page, 'cless/0/event/validating');
  expect(await suoni(page)).toEqual([]);
  await evento(page, 'cless/0/event/validated');
  expect(await suoni(page)).toEqual(['sound_ok.wav']);
});

test('US5-03: carta non valida riproduce sound_ko', async ({ page }) => {
  await evento(page, 'cless/0/event/validating');
  await evento(page, 'cless/0/event/invalid_card');
  expect(await suoni(page)).toEqual(['sound_ko.wav']);
});

test('US5-04: pagamento riproduce sound_ok con il messaggio di addebito, non prima', async ({ page }) => {
  await evento(page, 'cless/0/event/huntok', JSON.stringify({ data: { transactionid: 'TX-0001' } }));
  expect(await suoni(page)).toEqual([]);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Addebitati 1,2€', { timeout: PAGAMENTO_IN_CORSO_MS + 2000 });
  expect(await suoni(page)).toEqual(['sound_ok.wav']);
});

test('US5-05: file vuoto in config.audio disattiva il suono di quell\'esito', async ({ page }) => {
  await page.evaluate(() => { window.KIOSK_CONFIG.audio.ok = ''; });
  await evento(page, 'qr/0/event/read');
  expect(await suoni(page)).toEqual([]);
});
