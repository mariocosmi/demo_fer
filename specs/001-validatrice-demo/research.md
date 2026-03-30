# Research: Pagina Web Validatrice Biglietti

**Feature**: 001-validatrice-demo
**Date**: 2026-03-27

---

## 1. Libreria MQTT per browser

**Decisione**: `mqtt.min.js` copiato da `../emotikiosk-sncf/Assets/static/display/mqtt.min.js`
in `js/mqtt.min.js`.

**Motivazione**: Il progetto `emotikiosk-sncf` usa già questa implementazione minimale di
client MQTT over WebSocket (ES5, zero dipendenze, ~10 KB). Riutilizzarla garantisce
coerenza con il sistema reale e nessuna dipendenza esterna. La stessa porta WebSocket
(9001) e la stessa API (`mqtt.connect`, `client.on('message', ...)`) sono già testate
in produzione.

**API rilevante**:
```js
var client = mqtt.connect('ws://localhost:9001', {
  clientId: 'validatrice_' + Math.random().toString(16).slice(2, 8),
  reconnectPeriod: 3000,
  connectTimeout: 10000
});
client.on('connect', function() { client.subscribe(topic, { qos: 1 }); });
client.on('message', function(topic, payload) { /* ... */ });
client.on('reconnect', function() { /* ... */ });
client.on('close', function() { /* ... */ });
```

**Alternative considerate**:
- MQTT.js via CDN: rifiutata, richiede connessione internet e introduce dipendenza
  esterna; il progetto ha già il file in locale nel repo fratello.
- WebSocket raw: rifiutata, richiede implementare il protocollo MQTT da zero.

---

## 2. Libreria di logging

**Decisione**: `loglevel` v1.9.1 con wrapper `logger.js`, copiati da `../rfi-poc`.

**File**:
- `js/loglevel.min.js` — libreria (~3 KB)
- `js/logger.js` — wrapper con timestamp italiano, localStorage per livello persistente,
  helper `setLogDebug()` / `setLogInfo()` / `setLogWarn()`

**Motivazione**: Il Principio V della costituzione autorizza esplicitamente una libreria
di logging. `loglevel` è già usata nel progetto fratello `rfi-poc` con lo stesso pattern.
Il wrapper è già pronto e configurato in italiano.

**Chiave localStorage**: `validatrice-log-level` (adattata da `chiosco-log-level`).

---

## 3. Strategia di configurazione

**Decisione**: File `config.js` caricato come `<script>` prima di `app.js` in
`index.html`. Espone un oggetto globale `window.KIOSK_CONFIG`.

**Motivazione**: Approccio build-free (Principio IV). L'operatore modifica solo
`config.js` senza toccare la logica applicativa. Compatibile con apertura da
`file://` e da server HTTP.

**Struttura**:
```js
window.KIOSK_CONFIG = {
  broker: 'ws://localhost:9001',
  topics: {
    qrRead:          'qr/0/event/read',
    clessValidating: 'cless/0/event/validating',
    clessValidated:  'cless/0/event/validated',
    clessInvalidCard:'cless/0/event/invalid_card'
  },
  popupDurationMs: 3000
};
```

---

## 4. Macchina a stati popup

**Decisione**: Macchina a stati minimale in vanilla JS con 3 stati: `IDLE`,
`NFC_WAITING`, `SUCCESS`.

**Transizioni**:

| Stato corrente | Evento MQTT            | Nuovo stato | Azione                          |
|----------------|------------------------|-------------|----------------------------------|
| IDLE           | `qr/read`              | SUCCESS     | Mostra popup successo, avvia timer |
| IDLE           | `cless/validating`     | NFC_WAITING | Mostra popup attesa              |
| NFC_WAITING    | `cless/validated`      | SUCCESS     | Sostituisce popup, avvia timer   |
| NFC_WAITING    | `cless/invalid_card`   | SUCCESS     | Sostituisce popup, avvia timer   |
| NFC_WAITING    | `qr/read`              | SUCCESS     | Sostituisce popup, avvia timer   |
| SUCCESS        | qualsiasi lettura      | SUCCESS     | Rinnova timer                    |
| SUCCESS        | timer scaduto          | IDLE        | Nasconde popup                   |

---

## 5. Connessione WebSocket al broker

**Porta**: 9001 (WebSocket MQTT, standard MQTTnet).
**Reconnect**: gestito automaticamente da `mqtt.min.js` via `reconnectPeriod: 3000`.
**Indicatore stato**: eventi `connect`, `reconnect`, `close` aggiornano un elemento
DOM con classe CSS che cambia colore.
