/**
 * Test E2E — Suoni degli esiti.
 *
 * Quando mostra un esito, la pagina pubblica system/0/command/shell con il comando
 * del player (config.audio): sound_ok per QR letto, NFC validato e pagamento
 * autorizzato, sound_ko per carta non valida. Il suono lo riproduce system-deviced
 * sul validatore, perché WebKit in cog blocca l'audio senza un tocco sullo schermo.
 *
 * Come in us4, publish è sostituito da uno spy ed eventi simulati con
 * window.gestisciEvento(topic, payload).
 */

import { test, expect } from '@playwright/test';

const COMANDO_SHELL = 'system/0/command/shell';
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

async function comandiShell(page) {
  const chiamate = await page.evaluate(() => window.__publishCalls);
  return chiamate
    .filter((c) => c.topic === COMANDO_SHELL)
    .map((c) => JSON.parse(c.payload).data.command);
}

async function evento(page, topic, payload) {
  await page.evaluate(({ topic, payload }) => window.gestisciEvento(topic, payload), { topic, payload: payload || '{}' });
}

test('US5-01: QR letto riproduce sound_ok in background', async ({ page }) => {
  await evento(page, 'qr/0/event/read');
  expect(await comandiShell(page)).toEqual([
    'aplay -q /solari/emotikiosk/sounds/sound_ok.wav >/dev/null 2>&1 &'
  ]);
});

test('US5-02: NFC validato riproduce sound_ok, non al validating', async ({ page }) => {
  await evento(page, 'cless/0/event/validating');
  expect(await comandiShell(page)).toEqual([]);
  await evento(page, 'cless/0/event/validated');
  const comandi = await comandiShell(page);
  expect(comandi).toHaveLength(1);
  expect(comandi[0]).toContain('sound_ok.wav');
});

test('US5-03: carta non valida riproduce sound_ko', async ({ page }) => {
  await evento(page, 'cless/0/event/validating');
  await evento(page, 'cless/0/event/invalid_card');
  const comandi = await comandiShell(page);
  expect(comandi).toHaveLength(1);
  expect(comandi[0]).toContain('sound_ko.wav');
});

test('US5-04: pagamento riproduce sound_ok con il messaggio di addebito, non prima', async ({ page }) => {
  await evento(page, 'cless/0/event/huntok', JSON.stringify({ data: { transactionid: 'TX-0001' } }));
  expect(await comandiShell(page)).toEqual([]);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Addebitati 1,2€', { timeout: PAGAMENTO_IN_CORSO_MS + 2000 });
  const comandi = await comandiShell(page);
  expect(comandi).toHaveLength(1);
  expect(comandi[0]).toContain('sound_ok.wav');
});

test('US5-05: player vuoto in config.audio disattiva i suoni', async ({ page }) => {
  await page.evaluate(() => { window.KIOSK_CONFIG.audio.player = ''; });
  await evento(page, 'qr/0/event/read');
  expect(await comandiShell(page)).toEqual([]);
});
