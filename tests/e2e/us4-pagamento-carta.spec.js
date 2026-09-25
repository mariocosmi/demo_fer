/**
 * Test E2E — US4 (002-pagamento-carta-credito): Pagamento con carta di credito
 * contactless.
 *
 * Verifica il flusso a due fasi (come l'NFC):
 *   cless/0/event/huntok (con transactionid) → messaggio "Pagamento in corso..." (blu)
 *   → dopo 500ms → messaggio "Addebitati 1,2€, accesso autorizzato" (verde)
 *
 * La pubblicazione di cless/0/command/close avviene subito alla ricezione
 * dell'evento, indipendentemente dal messaggio visivo mostrato in quel momento.
 *
 * Non essendo disponibile un broker MQTT reale durante i test E2E (vedi
 * playwright.config.js), il client MQTT viene sostituito con uno spy su
 * `window.mqttClient.publish`, esposto da js/app.js solo a scopo di test.
 * Gli eventi vengono simulati chiamando direttamente window.gestisciEvento(topic, payload).
 */

import { test, expect } from '@playwright/test';

const TOPIC_HUNTOK       = 'cless/0/event/huntok';
const TOPIC_VALIDATING   = 'cless/0/event/validating';
const TOPIC_QR           = 'qr/0/event/read';
const COMANDO_CLOSE      = 'cless/0/command/close';
const POPUP_DURATA_MS    = 3000;
const PAGAMENTO_IN_CORSO_MS = 500;

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

// --- Fase 1: "Pagamento in corso..." ---

test('US4-01: Messaggio "Pagamento in corso..." appare subito dopo evento huntok', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  // Controllo immediato, prima che scatti il passaggio a successo (500ms)
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Pagamento in corso...');
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-attesa/);
});

// --- Fase 2: passaggio automatico a successo ---

test('US4-02: Dopo mezzo secondo il messaggio passa a "Addebitati 1,2€, accesso autorizzato"', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  await page.waitForTimeout(PAGAMENTO_IN_CORSO_MS + 200);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Addebitati 1,2€, accesso autorizzato');
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-attesa/);
});

test('US4-03: Il passaggio a successo non dipende da un nuovo evento (nessuna attesa esterna)', async ({ page }) => {
  const inizio = Date.now();
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  // Nessun secondo evento viene inviato: il passaggio deve avvenire comunque.
  // Soglia larga (il passaggio reale è di 500ms, il resto è overhead di polling
  // dell'assertion Playwright) per evitare flakiness.
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
  const elapsed = Date.now() - inizio;

  expect(elapsed).toBeLessThan(1500);
  console.log(`✅ Passaggio a successo in ${elapsed}ms`);
});

test('US4-04: Messaggio successo torna a IDLE automaticamente', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);

  await page.waitForTimeout(POPUP_DURATA_MS + 500);
  await expect(page.locator('#testo-messaggio-accesso')).not.toHaveClass(/messaggio-esito/);
});

// --- Rinnovo timer ---

test('US4-05: Un nuovo evento huntok durante "Pagamento in corso..." riavvia il ciclo', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Pagamento in corso...');

  // Secondo evento prima che scada il mezzo secondo: deve ripartire da capo
  await page.waitForTimeout(PAGAMENTO_IN_CORSO_MS - 200);
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0002') }
  );
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Pagamento in corso...');

  await page.waitForTimeout(PAGAMENTO_IN_CORSO_MS + 200);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Addebitati 1,2€, accesso autorizzato');
});

test('US4-06: Un nuovo evento huntok durante il messaggio di successo rinnova il timer di ripristino', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);

  await page.waitForTimeout(POPUP_DURATA_MS - 500);
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0002') }
  );

  // Se il timer non fosse stato rinnovato, a questo punto sarebbe già tornato a IDLE
  await page.waitForTimeout(700);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
});

// --- Sovrascrittura di altri stati del messaggio ---

test('US4-07: Evento huntok durante attesa NFC porta a "Pagamento in corso..." e poi al successo', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_VALIDATING);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Attendere prego...');

  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Pagamento in corso...');

  await page.waitForTimeout(PAGAMENTO_IN_CORSO_MS + 200);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Addebitati 1,2€, accesso autorizzato');
});

test('US4-08: Evento huntok dopo messaggio successo (QR) lo sostituisce', async ({ page }) => {
  await page.evaluate((topic) => window.gestisciEvento(topic), TOPIC_QR);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Biglietto valido, accesso autorizzato');

  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Pagamento in corso...');
  await page.waitForTimeout(PAGAMENTO_IN_CORSO_MS + 200);
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Addebitati 1,2€, accesso autorizzato');
});

// --- Correlazione transactionid sul comando di chiusura ---

test('US4-09: huntok con transactionid pubblica cless/0/command/close subito, senza attendere il passaggio a successo', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk('TX-0001') }
  );

  // Controllo immediato: il messaggio mostra ancora "Pagamento in corso...",
  // ma il comando è già stato pubblicato (FR-012)
  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Pagamento in corso...');

  const chiamate = await getPublishCalls(page);
  expect(chiamate).toHaveLength(1);
  expect(chiamate[0].topic).toBe(COMANDO_CLOSE);

  const corpo = JSON.parse(chiamate[0].payload);
  expect(corpo.data.transactionid).toBe('TX-0001');
});

test('US4-10: due eventi huntok con transactionid diversi producono due close corrispondenti', async ({ page }) => {
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

test('US4-11: huntok senza transactionid NON pubblica il comando close ma mostra comunque i messaggi', async ({ page }) => {
  await page.evaluate(
    ({ topic, payload }) => window.gestisciEvento(topic, payload),
    { topic: TOPIC_HUNTOK, payload: payloadHuntOk(null) }
  );

  await expect(page.locator('#testo-messaggio-accesso')).toContainText('Pagamento in corso...');
  await page.waitForTimeout(PAGAMENTO_IN_CORSO_MS + 200);
  await expect(page.locator('#testo-messaggio-accesso')).toHaveClass(/messaggio-esito/);

  const chiamate = await getPublishCalls(page);
  expect(chiamate).toHaveLength(0);
});
