/**
 * Test E2E — Hunt del POS.
 *
 * Il driver cless aspetta una carta di pagamento solo dopo cless/0/command/hunt.
 * La pagina lo pubblica alla connessione, a ogni ritorno in IDLE e, dopo un
 * cless/0/event/huntend, se dopo la pausa (huntRetryMs) e' ancora in IDLE.
 *
 * Come in us4: nessun broker reale, publish sostituito da uno spy; la connessione
 * si simula emettendo 'connect' sul client.
 */

import { test, expect } from '@playwright/test';

const COMANDO_HUNT  = 'cless/0/command/hunt';
const COMANDO_CLOSE = 'cless/0/command/close';
const TOPIC_HUNTEND = 'cless/0/event/huntend';
const TOPIC_HUNTOK  = 'cless/0/event/huntok';
const TOPIC_QR      = 'qr/0/event/read';
const POPUP_DURATA_MS = 3000;
const HUNT_RETRY_MS   = 3000;

const payload = (data) => JSON.stringify({ timestamp: '2026-10-14T12:00:00Z', data: data || {} });

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.gestisciEvento === 'function' && !!window.mqttClient);
  await page.evaluate(() => {
    window.__publishCalls = [];
    window.mqttClient.publish = function (topic, payload, opts, callback) {
      window.__publishCalls.push({ topic: topic, payload: payload });
      if (typeof callback === 'function') callback();
    };
    // le sottoscrizioni della connessione simulata non devono toccare la rete
    window.mqttClient.subscribe = function (topic, opts, callback) {
      if (typeof callback === 'function') callback();
    };
  });
});

async function evento(page, topic, data) {
  await page.evaluate(({ t, p }) => window.gestisciEvento(t, p), { t: topic, p: payload(data) });
}

async function comandi(page) {
  return (await page.evaluate(() => window.__publishCalls)).map((c) => c.topic);
}

test('US6-01: alla connessione al broker pubblica hunt', async ({ page }) => {
  await page.evaluate(() => window.mqttClient._emit('connect'));
  const hunt = (await page.evaluate(() => window.__publishCalls)).filter((c) => c.topic === COMANDO_HUNT);
  expect(hunt).toHaveLength(1);
  expect(JSON.parse(hunt[0].payload)).toMatchObject({ data: {} });
});

test('US6-02: al ritorno in IDLE dopo un esito pubblica hunt', async ({ page }) => {
  await evento(page, TOPIC_QR);
  expect(await comandi(page)).not.toContain(COMANDO_HUNT);
  await page.waitForTimeout(POPUP_DURATA_MS + 300);
  expect(await comandi(page)).toEqual([COMANDO_HUNT]);
});

test('US6-03: dopo huntok pubblica close, poi hunt al ritorno in IDLE', async ({ page }) => {
  await evento(page, TOPIC_HUNTOK, { transactionid: 'TX-0001' });
  expect(await comandi(page)).toEqual([COMANDO_CLOSE]);
  await page.waitForTimeout(500 + POPUP_DURATA_MS + 300);
  expect(await comandi(page)).toEqual([COMANDO_CLOSE, COMANDO_HUNT]);
});

test('US6-04: huntend in IDLE rimanda hunt dopo la pausa', async ({ page }) => {
  await evento(page, TOPIC_HUNTEND);
  await page.waitForTimeout(HUNT_RETRY_MS - 1000);
  expect(await comandi(page)).not.toContain(COMANDO_HUNT);
  await page.waitForTimeout(1300);
  expect(await comandi(page)).toEqual([COMANDO_HUNT]);
});

test('US6-05: huntend seguito da un pagamento non rimanda hunt durante l\'esito', async ({ page }) => {
  await evento(page, TOPIC_HUNTEND);
  await evento(page, TOPIC_HUNTOK, { transactionid: 'TX-0002' });
  await page.waitForTimeout(HUNT_RETRY_MS + 300);   // la pausa scade mentre l'esito e' ancora a schermo
  expect(await comandi(page)).toEqual([COMANDO_CLOSE]);
});
