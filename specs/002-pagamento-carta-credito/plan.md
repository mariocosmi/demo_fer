# Implementation Plan: Pagamento con Carta di Credito Contactless

**Branch**: `002-pagamento-carta-credito` | **Date**: 2026-09-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-pagamento-carta-credito/spec.md`

## Summary

Estende la pagina web validatrice (già esistente da `001-validatrice-demo`) con un
nuovo evento gestito dalla macchina a stati: `cless/0/event/huntok` (pagamento con
carta di credito contactless autorizzato). All'evento la pagina mostra il popup
"Addebitati 1,2€, accesso autorizzato" e, per la prima volta in questo progetto, **pubblica**
un messaggio MQTT (`cless/0/command/close`) per confermare al driver la chiusura della
transazione, riportando lo stesso `transactionid` ricevuto.

## Technical Context

**Language/Version**: HTML5 / CSS3 / JavaScript ES6 (vanilla) — stesso stack di 001
**Primary Dependencies**:
- `js/mqtt.min.js` — già presente, usato ora anche per `client.publish` (non solo subscribe)
- `js/loglevel.min.js` + `js/logger.js` — logging, invariato
**Storage**: N/A (nessuna persistenza dati)
**Testing**: Playwright E2E (`tests/e2e/*.spec.js`), stesso framework già in uso per US1/US2/US3
**Target Platform**: Browser desktop — Chrome, Firefox, Safari, Edge (ultime 2 versioni)
**Project Type**: Static web page (estensione della pagina esistente)
**Performance Goals**: Popup e comando `close` entro 1 secondo dalla ricezione dell'evento
**Constraints**: Build-free, nessun server-side; deve riusare la stessa macchina a stati
e le stesse convenzioni di popup già presenti in `js/app.js`
**Scale/Scope**: Una nuova transizione di stato + un nuovo popup + una nuova pubblicazione MQTT

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Stato | Note |
|-----------|-------|------|
| I. Lingua Italiana | ✅ | Codice, commenti e messaggi UI in italiano |
| II. Architettura Static-First | ✅ | Nessuna logica server-side introdotta |
| III. JavaScript Vanilla | ✅ | Riusa `mqtt.min.js` già giustificato in 001, nessuna nuova libreria |
| IV. Build-Free | ✅ | Nessun bundler o step di build introdotto |
| V. Osservabilità | ✅ | Ogni pubblicazione e anomalia (transactionid mancante) viene loggata |
| VI. Convenzioni Bash | N/A | Nessuno script Bash coinvolto |
| VII. Convenzioni MQTT | ✅ | Nuovo topic `cless/0/event/huntok` e comando `cless/0/command/close` seguono il pattern `<driver>/<id>/<direction>/<type>` e il wrapper `{timestamp, data}` |

**Re-check post Phase 1**: nessuna violazione aggiuntiva introdotta dal design; la
pubblicazione MQTT usa la stessa istanza `client` già creata per la subscribe.

## Project Structure

### Documentation (this feature)

```text
specs/002-pagamento-carta-credito/
├── plan.md              # Questo file
├── research.md          # Decisioni tecniche e rationale
├── data-model.md        # Entità, stati, configurazione (delta rispetto a 001)
├── quickstart.md        # Come testare manualmente il nuovo flusso
├── contracts/
│   └── mqtt-events.md   # Nuovo evento in ricezione + nuovo comando in pubblicazione
└── tasks.md             # (output di /speckit.tasks)
```

### Source Code (repository root — file esistenti, modificati)

```text
demo_fer/
├── index.html           # + nuovo elemento #popup-pagamento
├── config.js            # + topic clessHuntOk, + comando clessClose
├── css/
│   └── styles.css       # + stile #popup-pagamento
└── js/
    └── app.js           # + ramo huntok nella macchina a stati, + client.publish
tests/e2e/
└── us4-pagamento-carta.spec.js   # nuovo file di test E2E
```

**Structure Decision**: Nessuna nuova cartella o modulo: la feature si integra nei
file esistenti di `001-validatrice-demo`, seguendo lo stesso pattern (stato →
popup → eventualmente pubblicazione). Il client MQTT, prima solo in ascolto, ora
espone anche la capacità di pubblicare, riusando la stessa connessione.

## Complexity Tracking

Nessuna nuova violazione della costituzione: questa feature riusa le librerie e i
pattern già giustificati in `001-validatrice-demo/plan.md`. La sezione è vuota per
questa feature.
