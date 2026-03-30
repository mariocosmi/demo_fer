---

description: "Lista task per la feature 001-validatrice-demo"
---

# Tasks: Pagina Web Validatrice Biglietti

**Input**: Documenti di design da `/specs/001-validatrice-demo/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Test**: Nessun test automatizzato richiesto — testing manuale via browser + `mosquitto_pub`
(vedi `quickstart.md`).

**Nota librerie**: `js/mqtt.min.js`, `js/loglevel.min.js`, `js/logger.js` sono già presenti
in `demo_fer/js/` — non vanno scaricati né installati.

## Formato: `[ID] [P?] [Story?] Descrizione con percorso file`

---

## Phase 0: Test E2E (scritti prima dell'implementazione)

**Scopo**: I test E2E Playwright sono già scritti in `tests/e2e/`. Devono essere
eseguiti e FALLIRE prima di iniziare l'implementazione (red phase del ciclo TDD).

**Struttura già presente**:
```
tests/e2e/
├── idle-layout.spec.js      # 11 test — layout IDLE (logo, orologio, istruzione, dimensioni)
├── us1-qr.spec.js           # 7 test  — validazione QR (popup successo, timer, rinnovo)
├── us2-nfc.spec.js          # 11 test — validazione NFC (attesa, validated, invalid_card)
└── us3-connessione.spec.js  # 11 test — indicatore connessione (stati, transizioni, posizione)
```

- [X] T000 Eseguire `npm test` e verificare che tutti i 40 test falliscano (nessun file implementato ancora) — conferma che i test sono corretti e che l'implementazione è necessaria

---

## Phase 1: Setup

**Scopo**: Creare la struttura dei file, l'entry point HTML e il layout IDLE base.

- [X] T001 Creare `index.html` con struttura HTML5: `<head>` con meta charset/viewport/title e link a `css/styles.css`; caricamento script nell'ordine — `js/loglevel.min.js`, `js/logger.js`, `js/mqtt.min.js`, `config.js`, `js/app.js`; nel `<body>` inserire il layout IDLE con tre aree verticali: `<div id="area-logo">` con `<img src="logoFER.svg" alt="FER">`, `<div id="area-orologio">` con `<span id="orologio-data">` e `<span id="orologio-ora">`, `<div id="area-istruzione">` con testo "Validare il titolo di viaggio"
- [X] T002 [P] Creare `config.js` che espone `window.KIOSK_CONFIG` con: `broker` (`ws://localhost:9001`), `topics` (oggetto con `qrRead`, `clessValidating`, `clessValidated`, `clessInvalidCard`), `popupDurationMs` (3000)
- [X] T003 [P] Creare `css/styles.css`: reset CSS (`* { box-sizing: border-box; margin: 0; padding: 0; }`); `html` e `body` con `width: 600px; height: 1024px; overflow: hidden`; layout IDLE con `display: flex; flex-direction: column; justify-content: space-between; align-items: center` su `body`; `#area-logo` in alto con logo centrato e padding adeguato; `#area-orologio` al centro con font grande (data ~2rem, ora ~5rem), testo centrato; `#area-istruzione` in basso con testo centrato in evidenza, padding adeguato

---

## Phase 2: Fondamenta (Prerequisiti bloccanti)

**Scopo**: Clock live funzionante, connessione MQTT e macchina a stati — prerequisiti
per tutte le user story.

**⚠️ CRITICO**: Nessuna user story può essere implementata prima di completare questa fase.

- [X] T004 Creare `js/app.js` e implementare la funzione `aggiornaOrologio()` che scrive data (formato `DD/MM/YYYY`) in `#orologio-data` e ora (`HH:MM:SS`) in `#orologio-ora`; chiamarla subito al caricamento e poi ogni secondo con `setInterval`
- [X] T005 In `js/app.js` aggiungere l'inizializzazione MQTT: leggere `window.KIOSK_CONFIG`, creare il client con `mqtt.connect(config.broker, { clientId: 'validatrice_'+Math.random().toString(16).slice(2,8), reconnectPeriod: 3000, connectTimeout: 10000 })`; nel callback `connect` sottoscriversi ai 4 topic in `config.topics` con QoS 1; loggare ogni operazione con `log.info`/`log.debug`
- [X] T006 In `js/app.js` implementare la macchina a stati: variabile `stato` inizializzata a `'IDLE'`; funzione `gestisciEvento(topic)` che applica le transizioni da `data-model.md` (IDLE+qrRead→SUCCESS, IDLE+clessValidating→NFC_WAITING, NFC_WAITING+clessValidated/clessInvalidCard/qrRead→SUCCESS, SUCCESS+qualsiasi lettura→rinnova timer); collegare `gestisciEvento` al callback `client.on('message', function(topic) { gestisciEvento(topic); })`

**Checkpoint**: La pagina apre il layout IDLE (logo, orologio che scorre, istruzione),
si connette al broker e logga gli eventi MQTT in arrivo.

---

## Phase 3: User Story 1 — Validazione biglietto QR (Priority: P1) 🎯 MVP

**Goal**: Evento `qr/0/event/read` → overlay popup "Biglietto valido, buon viaggio!"
sopra il layout IDLE → chiusura automatica dopo 3 secondi.

**Independent Test**: Aprire `index.html`, eseguire
`mosquitto_pub -h localhost -p 1883 -t 'qr/0/event/read' -m '{"timestamp":"2026-03-27T12:00:00Z","data":{}}'`;
verificare che il popup appaia sopra il layout IDLE e scompaia dopo 3 secondi.

### Implementazione US1

- [X] T007 [US1] Aggiungere in `index.html` il markup del popup di successo prima della chiusura `</body>`: `<div id="popup-successo" class="popup nascosto"><p class="popup-testo">Biglietto valido, buon viaggio!</p></div>`
- [X] T008 [US1] Aggiungere in `css/styles.css` gli stili del popup di successo: `.popup` con `position: fixed; top: 0; left: 0; width: 600px; height: 1024px; display: flex; align-items: center; justify-content: center; z-index: 100`; `#popup-successo` con `background: #009B3A`; `.popup-testo` con colore bianco, font molto grande, testo centrato; `.nascosto` con `display: none`
- [X] T008 [US1] In `js/app.js` implementare `mostraPopupSuccesso()` (rimuove `.nascosto` da `#popup-successo`, azzera il timer precedente se attivo, avvia `setTimeout` di `config.popupDurationMs` ms che chiama `nascondiPopup()`) e `nascondiPopup()` (aggiunge `.nascosto` a tutti i popup, imposta `stato = 'IDLE'`); collegare `mostraPopupSuccesso()` alla transizione →SUCCESS in `gestisciEvento`

**Checkpoint**: US1 completamente funzionante — layout IDLE visibile, popup verde appare
e scompare su evento QR.

---

## Phase 4: User Story 2 — Validazione tessera contactless (Priority: P2)

**Goal**: `cless/validating` → overlay "Attendere prego..." → `cless/validated` o
`invalid_card` → overlay "Biglietto valido, buon viaggio!" → chiusura automatica.

**Independent Test**: Eseguire `mosquitto_pub ... -t 'cless/0/event/validating' -m '...'`,
verificare il popup di attesa; poi `mosquitto_pub ... -t 'cless/0/event/validated' -m '...'`,
verificare la transizione al popup di successo.

### Implementazione US2

- [X] T010 [US2] Aggiungere in `index.html` il markup del popup di attesa: `<div id="popup-attesa" class="popup nascosto"><p class="popup-testo">Attendere prego...</p></div>`
- [X] T011 [US2] Aggiungere in `css/styles.css` gli stili del popup di attesa: `#popup-attesa` con `background: #0063AF`; stessa struttura overlay del popup di successo; il popup di attesa NON ha timer di chiusura autonomo
- [X] T012 [US2] In `js/app.js` implementare `mostraPopupAttesa()` (nasconde tutti i popup, rimuove `.nascosto` da `#popup-attesa`); collegare alla transizione →NFC_WAITING in `gestisciEvento`; verificare che le transizioni NFC_WAITING→SUCCESS (per `clessValidated`, `clessInvalidCard`, `qrRead`) chiamino `mostraPopupSuccesso()` che nasconde `#popup-attesa` prima di mostrare `#popup-successo`

**Checkpoint**: US1 e US2 funzionanti; il flusso NFC completo mostra i due overlay in
sequenza sopra il layout IDLE.

---

## Phase 5: User Story 3 — Indicatore stato connessione (Priority: P3)

**Goal**: Pallino colorato fisso in alto a destra che riflette lo stato MQTT in tempo reale.

**Independent Test**: Aprire la pagina con broker attivo (pallino verde), spegnere il broker
(pallino rosso entro 5 sec), riavviare il broker (pallino verde senza ricaricare la pagina).

### Implementazione US3

- [X] T013 [US3] Aggiungere in `index.html` l'indicatore di connessione sovrapposto al layout con `position: fixed`: `<div id="indicatore-connessione" class="disconnected"><span class="pallino"></span><span class="etichetta">Disconnesso</span></div>`
- [X] T014 [US3] Aggiungere in `css/styles.css` gli stili dell'indicatore: `#indicatore-connessione` con `position: fixed; top: 12px; right: 12px; display: flex; align-items: center; gap: 6px; z-index: 200`; `.pallino` cerchio 12px; `#indicatore-connessione.connected .pallino` → `background: #009B3A`; `#indicatore-connessione.reconnecting .pallino` → `background: #FF6600`; `#indicatore-connessione.disconnected .pallino` → `background: #CC0000`; etichetta in italiano corrispondente
- [X] T015 [US3] In `js/app.js` implementare `aggiornaStatoConnessione(stato)` che sostituisce la classe CSS e il testo di `#indicatore-connessione`; collegarla a `client.on('connect')` → `'connected'`, `client.on('reconnect')` → `'reconnecting'`, `client.on('close')` → `'disconnected'`

**Checkpoint**: Tutte e tre le user story funzionanti e testabili indipendentemente.

---

## Phase N: Rifinitura e cross-cutting

**Scopo**: Osservabilità completa e validazione finale della demo.

- [X] T016 Aggiungere in `js/app.js` log esaustivi: `log.debug` per ogni messaggio MQTT ricevuto (topic + payload troncato), `log.info` per ogni transizione di stato, `log.info` per ogni cambio di connessione, `log.debug` per apertura/chiusura di ogni popup
- [X] T017 Validare la demo completa seguendo `specs/001-validatrice-demo/quickstart.md`: verificare layout IDLE (logo visibile, orologio che scorre, testo in basso), testare evento QR, testare sequenza NFC completa, testare `invalid_card`, testare disconnessione e riconnessione automatica del broker

---

## Dipendenze e ordine di esecuzione

### Dipendenze tra fasi

- **Setup (Phase 1)**: Nessuna dipendenza — iniziare subito; T002 e T003 in parallelo con T001
- **Fondamenta (Phase 2)**: Dipende dal completamento del Setup — BLOCCA tutte le user story
- **US1 (Phase 3)**: Dipende dalle Fondamenta; T007 e T008 in parallelo, T009 dipende da entrambi
- **US2 (Phase 4)**: Dipende dalle Fondamenta e da T009 (funzione `nascondiPopup` già definita); T010 e T011 in parallelo
- **US3 (Phase 5)**: Dipende dalle Fondamenta (client MQTT creato in T005); T013 e T014 in parallelo
- **Rifinitura (Phase N)**: Dipende da tutte le user story desiderate

### Dipendenze interne

- **US1**: T007 [P] T008 → T009
- **US2**: T010 [P] T011 → T012 (richiede T009 completato)
- **US3**: T013 [P] T014 → T015 (richiede T005 completato)

### Opportunità di parallelismo

- T002, T003 in parallelo durante il Setup
- T007, T008 (US1 markup+stile) in parallelo
- T010, T011 (US2 markup+stile) in parallelo
- T013, T014 (US3 markup+stile) in parallelo
- US2 e US3 possono procedere in parallelo dopo che US1 è completata

---

## Esempio di esecuzione parallela — US1

```bash
# Markup e stili in parallelo:
Task: "T007 — Markup popup successo in index.html"
Task: "T008 — Stili popup successo in css/styles.css"

# Poi, quando entrambi completati:
Task: "T009 — mostraPopupSuccesso() in js/app.js"
```

---

## Strategia di implementazione

### MVP (solo US1)

1. Completare Phase 1: Setup (layout IDLE visibile)
2. Completare Phase 2: Fondamenta (clock + MQTT funzionanti)
3. Completare Phase 3: US1 (popup QR)
4. **STOP e VALIDA** con `mosquitto_pub`
5. Demo già mostrabile per il caso QR

### Consegna incrementale

1. Setup → layout IDLE visibile con orologio che scorre
2. Fondamenta → connessione MQTT verificata nei log
3. US1 → popup QR funzionante → prima demo mostrabile
4. US2 → flusso NFC completo → demo completa
5. US3 → indicatore connessione → demo robusta per il setup
6. Rifinitura → log esaustivi + validazione finale

---

## Note

- `[P]` = task parallelizzabile (file diversi, nessuna dipendenza pendente)
- `[USn]` = appartenenza alla user story n per tracciabilità
- Le librerie `js/mqtt.min.js`, `js/loglevel.min.js`, `js/logger.js` sono già presenti — non crearle
- Colori FER: verde `#009B3A`, blu `#0063AF`
- Il testo di tutti i messaggi UI e i commenti nel codice DEVONO essere in italiano (Principio I)
- La pagina ha dimensioni fisse 600×1024 px — nessun elemento deve causare overflow
