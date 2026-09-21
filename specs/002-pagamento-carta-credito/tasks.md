---

description: "Lista task per la feature 002-pagamento-carta-credito"
---

# Tasks: Pagamento con Carta di Credito Contactless

**Input**: Documenti di design da `/specs/002-pagamento-carta-credito/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Test**: Test E2E Playwright, coerenti con `tests/e2e/us1-qr.spec.js` e
`tests/e2e/us2-nfc.spec.js` già presenti nel progetto.

**Nota**: Questa feature modifica file esistenti creati in `001-validatrice-demo`
(`index.html`, `config.js`, `css/styles.css`, `js/app.js`) — non li ricrea da zero.

## Formato: `[ID] [P?] [Story?] Descrizione con percorso file`

---

## Phase 1: Setup

**Scopo**: Estendere la configurazione con il nuovo topic e il nuovo comando.

- [X] T001 In `config.js` aggiungere `topics.clessHuntOk = 'cless/0/event/huntok'` e una nuova sezione `commands: { clessClose: 'cless/0/command/close' }`, separata da `topics` così che `Object.values(config.topics)` non sottoscriva anche il comando

---

## Phase 2: Fondamenta (Prerequisiti bloccanti)

**Scopo**: Rendere il client MQTT accessibile alla macchina a stati per poter pubblicare,
non solo sottoscrivere.

**⚠️ CRITICO**: Nessuna user story può essere implementata prima di completare questa fase.

- [X] T002 In `js/app.js` promuovere la variabile `client` (oggi locale a `avviaConnessioneMQTT`) a variabile di modulo, inizializzata a `null` in cima al file insieme a `stato`, `timerPopup`, `timerAttesaNFC`; assegnarla (senza `var`) dentro `avviaConnessioneMQTT()`; subito dopo la creazione esporla come `window.mqttClient = client;` (solo per consentire ai test E2E di sostituire `publish` con uno spy, senza broker reale)
- [X] T003 In `js/app.js` modificare il callback `client.on('message', function (topic, payload) { ... })` per passare anche `payload` a `gestisciEvento(topic, payload)`; aggiornare la firma di `gestisciEvento` in `function gestisciEvento(topic, payload) { ... }` (i rami esistenti che non usano `payload` restano invariati)

**Checkpoint**: Il client MQTT è raggiungibile da `gestisciEvento` e i messaggi arrivano
con il loro payload, senza alterare il comportamento di US1/US2/US3 già esistenti.

---

## Phase 3: User Story 1 — Pagamento con carta di credito contactless (Priority: P1) 🎯 MVP

**Goal**: Evento `cless/0/event/huntok` → popup "Addebitati 1,2€, benvenuto" → pubblicazione
`cless/0/command/close` con lo stesso `transactionid` → chiusura automatica del popup dopo 3s.

**Independent Test**: Aprire `index.html`, eseguire
`mosquitto_pub -h localhost -p 1883 -t 'cless/0/event/huntok' -m '{"timestamp":"...","data":{"transactionid":"TX-0001"}}'`;
verificare che il popup appaia e che su `cless/0/command/close` arrivi lo stesso `transactionid`
(`mosquitto_sub -t 'cless/0/command/close' -v`).

### Test per US1 (scritti prima dell'implementazione)

- [X] T004 [P] [US1] Creare `tests/e2e/us4-pagamento-carta.spec.js` (Playwright) con i casi: popup "Addebitati 1,2€, benvenuto" appare entro 1s da `cless/0/event/huntok` con `transactionid`; il popup si chiude automaticamente dopo `popupDurationMs`; il timer si rinnova su un nuovo `huntok` con `transactionid` diverso; un `huntok` sovrascrive un popup di attesa NFC o un popup successo già visibili; viene chiamato `window.mqttClient.publish` con topic `cless/0/command/close` e `JSON.parse(payload).data.transactionid` identico a quello ricevuto; se l'evento non contiene `transactionid`, `publish` NON viene chiamato e il popup di pagamento appare comunque — i test sostituiscono `window.mqttClient.publish` con uno spy prima di invocare `window.gestisciEvento(topic, payload)`, passando `payload` come stringa JSON (stesso formato di un `Buffer.toString()`)

### Implementazione US1

- [X] T005 [US1] Aggiungere in `index.html`, dopo `#popup-attesa`, il markup `<div id="popup-pagamento" class="popup nascosto"><p class="popup-testo">Addebitati 1,2€, benvenuto</p></div>`
- [X] T006 [P] [US1] Aggiungere in `css/styles.css` la regola `#popup-pagamento { background-color: #009B3A; }` (stesso verde di `#popup-successo`, coerente con un esito positivo)
- [X] T007 [US1] In `js/app.js` implementare `mostraPopupPagamento()` sullo stesso modello di `mostraPopupSuccesso()` (azzera `timerPopup` precedente, nasconde `#popup-attesa` e `#popup-successo`, mostra `#popup-pagamento`, avvia `setTimeout(nascondiPopup, config.popupDurationMs)`); aggiornare `nascondiPopup()` per nascondere anche `#popup-pagamento`
- [X] T008 [US1] In `js/app.js` implementare `pubblicaChiusuraCless(transactionId)`: se `client` è `null` loggare un `warn` e uscire; altrimenti pubblicare su `config.commands.clessClose` il payload `{ timestamp: new Date().toISOString(), data: { transactionid: transactionId } }` serializzato in JSON, con `qos: 1`, loggando esito con `log.info`/`log.warn` nel callback
- [X] T009 [US1] In `js/app.js`, dentro `gestisciEvento`, aggiungere il ramo `else if (topic === config.topics.clessHuntOk)`: qualunque sia lo stato corrente (come per `qrRead`), annullare un eventuale `timerAttesaNFC`, impostare `stato = 'SUCCESS'`, chiamare `mostraPopupPagamento()`; effettuare il parsing sicuro (`try/catch`) di `payload` come JSON per leggere `data.transactionid`; se presente e non vuoto chiamare `pubblicaChiusuraCless(transactionId)`, altrimenti loggare un `warn` e NON pubblicare nulla

**Checkpoint**: US1 completamente funzionante e verificabile sia manualmente
(`quickstart.md`) sia via i nuovi test Playwright.

---

## Phase N: Rifinitura e cross-cutting

- [X] T010 Eseguire `npm test` e verificare che tutti i test (US1–US3 esistenti + nuovi test US1 pagamento) passino, senza regressioni sulle user story di `001-validatrice-demo`
- [X] T011 Validare manualmente seguendo `specs/002-pagamento-carta-credito/quickstart.md`: popup corretto, `cless/0/command/close` pubblicato con lo stesso `transactionid`, chiusura automatica del popup

---

## Dipendenze e ordine di esecuzione

- **Setup (Phase 1)**: nessuna dipendenza, T001 indipendente dal resto
- **Fondamenta (Phase 2)**: dipende da T001 solo per coerenza di config; BLOCCA la Phase 3
- **US1 (Phase 3)**: dipende dalla Phase 2; T004 (test) può essere scritto in parallelo a T005/T006; T007 e T006 in parallelo; T008 e T009 dipendono da T002/T003 (client e payload disponibili) e da T007 (popup pronto)
- **Rifinitura (Phase N)**: dipende dal completamento della Phase 3

### Opportunità di parallelismo

- T004 (test) in parallelo con T005/T006 (markup/stile), poi eseguito a valle di T007–T009
- T006 (stile) in parallelo con T005 (markup) e T007 (JS)

---

## Strategia di implementazione

### MVP (US1, unica user story della feature)

1. Setup (T001) + Fondamenta (T002–T003)
2. Test US1 (T004) — devono FALLIRE prima dell'implementazione
3. Implementazione US1 (T005–T009)
4. Rifinitura (T010–T011)

---

## Note

- `[P]` = task parallelizzabile (file diversi, nessuna dipendenza pendente)
- `[US1]` = appartenenza alla user story 1 (unica in questa feature) per tracciabilità
- Colore riusato: verde FER `#009B3A` (stesso di `#popup-successo`)
- Testo e commenti in italiano (Principio I)
- `window.mqttClient` è esposto solo per testabilità E2E, non introduce nuove dipendenze
