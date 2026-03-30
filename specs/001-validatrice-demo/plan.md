# Implementation Plan: Pagina Web Validatrice Biglietti

**Branch**: `001-validatrice-demo` | **Date**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-validatrice-demo/spec.md`

## Summary

Pagina web statica di dimostrazione per una validatrice di biglietti ferroviari.
Si connette al broker MQTT locale via WebSocket e mostra popup contestuali in risposta
agli eventi dei driver QR e NFC contactless. Nessun backend, nessun build step,
vanilla JS + `mqtt.min.js` (da emotikiosk-sncf) + `loglevel` (da rfi-poc).

## Technical Context

**Language/Version**: HTML5 / CSS3 / JavaScript ES6 (vanilla)
**Primary Dependencies**:
- `js/mqtt.min.js` — client MQTT over WebSocket (copiato da emotikiosk-sncf)
- `js/loglevel.min.js` + `js/logger.js` — logging (copiato da rfi-poc)
**Storage**: N/A (nessuna persistenza dati)
**Testing**: Manuale via browser + `mosquitto_pub` per simulare eventi MQTT
**Target Platform**: Browser desktop — Chrome, Firefox, Safari, Edge (ultime 2 versioni)
**Project Type**: Static web page
**Performance Goals**: Popup visibile entro 1 secondo dalla ricezione dell'evento MQTT
**Constraints**: Build-free, nessun server-side, apribile da `file://` o HTTP; risoluzione fissa 600×1024 px portrait, nessun scroll, nessuna scrollbar
**Scale/Scope**: Singola pagina, monitor da demo fisso

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Stato | Note |
|-----------|-------|------|
| I. Lingua Italiana | ✅ | Tutto il codice, i commenti e i messaggi UI sono in italiano |
| II. Architettura Static-First | ✅ | Solo HTML/CSS/JS statici, nessuna logica server-side |
| III. JavaScript Vanilla | ⚠️ Giustificata | `mqtt.min.js` è un'implementazione di protocollo, non un framework UI. Non esiste alternativa vanilla praticabile. Documentata nel Complexity Tracking. |
| IV. Build-Free | ✅ | Nessun bundler, transpiler o step di build |
| V. Osservabilità | ✅ | `loglevel` con wrapper italiano, helper a console, livelli configurabili |
| VI. Convenzioni Bash | N/A | Nessuno script Bash in questa feature |
| VII. Convenzioni MQTT | ✅ | Topic seguono `<driver>/<id>/event/<type>`; payload con wrapper `{timestamp, data}` |

**Re-check post Phase 1**: nessuna violazione aggiuntiva introdotta dal design.

## Project Structure

### Documentation (this feature)

```text
specs/001-validatrice-demo/
├── plan.md              # Questo file
├── research.md          # Decisioni tecniche e rationale
├── data-model.md        # Entità, stati, configurazione
├── quickstart.md        # Come avviare e testare la demo
├── contracts/
│   └── mqtt-events.md   # Topic e payload MQTT attesi
└── tasks.md             # (output di /speckit.tasks)
```

### Source Code (repository root)

```text
demo_fer/
├── index.html           # Pagina principale (unico entry point)
├── config.js            # Configurazione broker, topic, timeout
├── css/
│   └── styles.css       # Stili pagina e popup
└── js/
    ├── mqtt.min.js      # Client MQTT (copiato da emotikiosk-sncf)
    ├── loglevel.min.js  # Libreria logging (copiata da rfi-poc)
    ├── logger.js        # Wrapper logging con timestamp italiano
    └── app.js           # Logica principale: connessione MQTT, macchina a stati, popup
```

**Structure Decision**: Singolo progetto flat al root. Nessuna cartella `src/` —
la pagina è abbastanza semplice da non richiedere struttura aggiuntiva. I file di
libreria risiedono in `js/` insieme ad `app.js`.

## Complexity Tracking

| Violazione | Perché necessaria | Alternativa più semplice rifiutata perché |
|------------|-------------------|------------------------------------------|
| Principio III — uso di `mqtt.min.js` | Connettere un browser a un broker MQTT richiede un'implementazione del protocollo MQTT over WebSocket. Non esiste alternativa vanilla. | WebSocket raw: richiederebbe implementare il framing MQTT, QoS, keep-alive da zero — sproporzionato per una demo. |
| Principio III — uso di `loglevel` | Il Principio V della costituzione autorizza esplicitamente una libreria di logging con livelli configurabili. | `console.log` wrappato: privo di gestione livelli a runtime, non soddisfa il Principio V. |
