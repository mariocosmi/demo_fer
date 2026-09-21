# Data Model: Pagamento con Carta di Credito Contactless

**Feature**: 002-pagamento-carta-credito
**Date**: 2026-09-18

Questo file documenta solo il **delta** rispetto a `001-validatrice-demo/data-model.md`.

---

## EventoMQTT — nuovo topic in ricezione

### `cless/0/event/huntok`

A differenza degli eventi già gestiti in 001 (dove `data` è ignorato), qui il campo
`data` viene letto:

| Campo           | Tipo   | Obbligatorio | Descrizione                                  |
|-----------------|--------|--------------|-----------------------------------------------|
| data.transactionid | string | sì (per rispondere) | Identificativo univoco della transazione autorizzata |

Se `transactionid` è assente, l'evento produce comunque il messaggio di pagamento
(FR-002) ma NON produce il comando `close` (FR-007).

---

## ComandoMQTT — nuovo messaggio pubblicato dalla pagina

Prima di questa feature la pagina era in sola lettura (vedi 001,
`contracts/mqtt-events.md § Messaggi NON pubblicati`). Con questa feature la pagina
pubblica per la prima volta un messaggio.

### `cless/0/command/close`

| Campo              | Tipo   | Descrizione                                         |
|--------------------|--------|------------------------------------------------------|
| timestamp          | string | ISO8601, generato dalla pagina al momento dell'invio |
| data.transactionid | string | Stesso valore ricevuto in `cless/0/event/huntok`     |

---

## StatoMessaggio — aggiornamento macchina a stati

Nessun nuovo stato: `huntok` è una nuova transizione verso lo stato `SUCCESS` già
esistente in 001, ma con un testo del messaggio diverso (stesso colore verde).

| Stato       | Descrizione                                         | Testo del messaggio (colore)                                     |
|-------------|-----------------------------------------------------|-----------------------------------------------------------------|
| SUCCESS (QR / NFC) | Lettura biglietto completata                 | "Biglietto valido, accesso autorizzato" (verde)                 |
| SUCCESS (pagamento) | Pagamento con carta di credito autorizzato  | "Addebitati 1,2€, accesso autorizzato" (verde)                  |

**Nuova transizione**:

| Stato corrente | Evento MQTT            | Nuovo stato | Azione                                                        |
|-----------------|------------------------|-------------|----------------------------------------------------------------|
| qualsiasi       | `cless/0/event/huntok` | SUCCESS     | Mostra messaggio pagamento, avvia timer di ripristino, pubblica `cless/0/command/close` con lo stesso `transactionid` |

---

## Configurazione (`window.KIOSK_CONFIG`) — nuovi campi

| Campo                     | Tipo   | Default                    | Descrizione                          |
|---------------------------|--------|-----------------------------|----------------------------------------|
| topics.clessHuntOk        | string | `cless/0/event/huntok`      | Topic pagamento carta autorizzato (subscribe) |
| commands.clessClose       | string | `cless/0/command/close`     | Topic comando di chiusura (publish)    |

`commands` è una sezione nuova, separata da `topics`, perché la pagina sottoscrive
tutti i valori in `topics` (`Object.values(config.topics)`) ma non deve sottoscriversi
ai comandi che pubblica.
