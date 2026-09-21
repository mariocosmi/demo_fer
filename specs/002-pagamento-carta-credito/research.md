# Research: Pagamento con Carta di Credito Contactless

**Feature**: 002-pagamento-carta-credito
**Date**: 2026-09-18

---

## 1. Pubblicazione MQTT dal browser (novità rispetto a 001)

**Decisione**: Riusare la stessa istanza `client` creata da `mqtt.connect(...)` in
`avviaConnessioneMQTT()`, promuovendola a variabile di modulo (invece di una `var`
locale alla funzione), così che la macchina a stati possa chiamare `client.publish(...)`
quando riceve `cless/0/event/huntok`.

**Motivazione**: `mqtt.min.js` (già in uso) espone sia `subscribe` che `publish` sulla
stessa istanza client; non serve una seconda connessione né una libreria aggiuntiva.

**Alternative considerate**:
- Nuova connessione dedicata alla pubblicazione: rifiutata, spreco di risorse e
  complessità per un solo comando di risposta.

---

## 2. Correlazione della risposta (`transactionid`)

**Decisione**: Il `transactionid` viene letto da `data.transactionid` nel payload
dell'evento `cless/0/event/huntok` e ripubblicato identico in `data.transactionid`
nel payload di `cless/0/command/close`, secondo il wrapper standard
`{"timestamp": "ISO8601", "data": {...}}`.

**Motivazione**: È l'unico modo per il driver contactless di associare la risposta
di chiusura alla transazione corretta, specificato esplicitamente nella richiesta
della feature.

**Caso di errore**: se `data.transactionid` è assente o non è una stringa non vuota,
il comando `close` NON viene pubblicato (evitando una risposta malformata) e viene
registrato un warning in console (Principio V — Osservabilità).

---

## 3. Riuso della macchina a stati esistente

**Decisione**: L'evento `huntok` viene trattato come una nuova causa di transizione
verso lo stato `SUCCESS` già esistente (esattamente come `qr/read`, `validated` e
`invalid_card`), non come un nuovo stato dedicato. Il popup mostrato cambia
(`#popup-pagamento` invece di `#popup-successo`), ma le regole di timer, rinnovo e
sovrascrittura restano quelle già validate in `001-validatrice-demo`.

**Motivazione**: Minimizza la complessità della macchina a stati e mantiene coerenza
con l'assunzione già documentata in `spec.md`: questa user story condivide le stesse
regole di comportamento del popup delle altre.

---

## 4. Testabilità della pubblicazione senza broker reale

**Decisione**: Il client MQTT viene esposto come `window.mqttClient` (in aggiunta a
`window.gestisciEvento`, già esposto in 001) esclusivamente per permettere ai test
Playwright di sostituire `publish` con uno spy, senza richiedere un broker MQTT reale
durante i test E2E (che già oggi girano senza broker, vedi `playwright.config.js`).

**Motivazione**: Coerente con il pattern di testing già in uso nel progetto (nessun
broker nel webServer di Playwright); permette di verificare topic e payload del
comando `close` senza infrastruttura aggiuntiva.
