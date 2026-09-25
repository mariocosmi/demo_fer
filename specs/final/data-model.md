# Data Model: Validatrice FER — Accesso alla Sala d'Attesa

**Date**: 2026-09-21
**Status**: Riflette lo stato attualmente implementato (`config.js`, `js/app.js`)

---

## Entità principali

### EventoMQTT

Messaggio ricevuto dal broker. La pagina legge il campo `data` solo per
`cless/0/event/huntok` (per `data.transactionid`); per tutti gli altri topic la
sola ricezione sul topic corretto è sufficiente a far scattare la transizione.

| Campo     | Tipo   | Descrizione                                        |
|-----------|--------|-----------------------------------------------------|
| timestamp | string | ISO8601, generato dal driver (non usato dalla UI)   |
| data      | object | Payload specifico del driver                        |

**Topic sottoscritti** (`config.topics`):

| Chiave              | Topic                         | `data` letto?              |
|----------------------|--------------------------------|-----------------------------|
| `qrRead`             | `qr/0/event/read`             | No                           |
| `clessValidating`    | `cless/0/event/validating`    | No                           |
| `clessValidated`     | `cless/0/event/validated`     | No                           |
| `clessInvalidCard`   | `cless/0/event/invalid_card`  | No                           |
| `clessHuntOk`        | `cless/0/event/huntok`        | Sì — `data.transactionid`   |

---

### StatoMessaggio (macchina a stati)

Stato interno che governa testo, colore e presenza del bordo dell'unico
messaggio di accesso sopra l'orologio (`#testo-messaggio-accesso`). Nessun
overlay a schermo intero: il layout resta identico, cambia solo il messaggio.

| Stato       | Descrizione                                         | Testo del messaggio                                               | Colore / classe CSS              | Bordo |
|-------------|-----------------------------------------------------|---------------------------------------------------------------------|-----------------------------------|-------|
| IDLE        | Nessuna lettura in corso, pagina in attesa          | "Accesso con titolo di viaggio valido o carta di credito contactless (1,2€)" | blu-grigio di default (nessuna classe) | No |
| NFC_WAITING | Carta NFC rilevata, validazione in corso            | "Attendere prego..."                                                 | blu `#0063AF` — `.messaggio-attesa` | Sì |
| SUCCESS (QR / NFC) | Lettura biglietto completata, esito positivo | "Biglietto valido, accesso autorizzato"                              | verde `#009B3A` — `.messaggio-esito` | Sì |
| ERROR (NFC) | Lettura NFC completata, esito negativo — accesso NON concesso | "Titolo di viaggio non valido"                    | rosso `#CC0000` — `.messaggio-errore` | Sì |
| SUCCESS (pagamento — sotto-fase 1) | Pagamento autorizzato, primi 500ms  | "Pagamento in corso..."                                              | blu `#0063AF` — `.messaggio-attesa` | Sì |
| SUCCESS (pagamento — sotto-fase 2) | Pagamento autorizzato, dopo 500ms   | "Addebitati 1,2€, accesso autorizzato"                               | verde `#009B3A` — `.messaggio-esito` | Sì |

La sotto-fase del pagamento non è un valore separato della variabile `stato`
(che passa a `SUCCESS` subito alla ricezione di `huntok`): è solo una
transizione visiva a tempo, interna a `mostraMessaggioPagamentoInCorso()`.

**Transizioni**:

| Stato corrente         | Evento / timer                                     | Nuovo stato | Azione |
|--------------------------|-----------------------------------------------------|-------------|--------|
| qualsiasi                | `qr/0/event/read`                                  | SUCCESS     | Mostra messaggio successo, avvia timer di ripristino (`popupDurationMs`) |
| IDLE                      | `cless/0/event/validating`                         | NFC_WAITING | Mostra messaggio attesa (nessun timer di ripristino automatico) |
| (altro stato)             | `cless/0/event/validating`                         | invariato   | Evento ignorato |
| NFC_WAITING               | `cless/0/event/validated`                          | SUCCESS     | Mostra messaggio successo, avvia timer di ripristino |
| NFC_WAITING               | `cless/0/event/invalid_card`                       | ERROR       | Mostra messaggio errore "Titolo di viaggio non valido", avvia timer di ripristino |
| (stato ≠ NFC_WAITING)     | `cless/0/event/validated` o `.../invalid_card`     | invariato   | Evento ignorato |
| qualsiasi                | `cless/0/event/huntok`                             | SUCCESS     | Mostra subito "Pagamento in corso...", avvia timer di 500ms; pubblica subito `cless/0/command/close` con lo stesso `transactionid` (se presente), senza attendere il timer |
| SUCCESS (pagamento, sotto-fase 1) | timer di 500ms scade                       | SUCCESS     | Mostra messaggio di successo pagamento, avvia timer di ripristino (`popupDurationMs`) |
| (timer di ripristino scade) | —                                                | IDLE        | Ripristina il messaggio di default |
| NFC_WAITING (10s senza esito) | timeout di sicurezza                           | IDLE        | Ripristina il messaggio di default (timeout indipendente da `popupDurationMs`) |

Un nuovo evento (qualsiasi topic) ricevuto durante la sotto-fase "Pagamento in
corso..." annulla il timer di 500ms pendente (gestito centralmente in
`impostaMessaggio()`), quindi un secondo `huntok` in quella finestra fa
ripartire il ciclo da capo.

---

### ComandoMQTT (pubblicato dalla pagina)

### `cless/0/command/close`

| Campo              | Tipo   | Descrizione                                          |
|---------------------|--------|--------------------------------------------------------|
| timestamp           | string | ISO8601, generato dalla pagina al momento dell'invio    |
| data.transactionid  | string | Stesso valore ricevuto in `cless/0/event/huntok`        |

Pubblicato con `qos: 1`. Non viene pubblicato se `cless/0/event/huntok` non
conteneva un `transactionid` valido, o se il client MQTT non è ancora connesso
(in quel caso l'anomalia viene solo loggata).

---

### Configurazione (`window.KIOSK_CONFIG`, in `config.js`)

| Campo                     | Tipo   | Default                       | Descrizione                                         |
|----------------------------|--------|---------------------------------|--------------------------------------------------------|
| broker                     | string | `ws://localhost:9001`          | URL WebSocket del broker                                |
| topics.qrRead               | string | `qr/0/event/read`              | Topic lettura QR (subscribe)                            |
| topics.clessValidating      | string | `cless/0/event/validating`     | Topic NFC rilevata (subscribe)                          |
| topics.clessValidated       | string | `cless/0/event/validated`      | Topic NFC validata (subscribe)                          |
| topics.clessInvalidCard     | string | `cless/0/event/invalid_card`   | Topic NFC errore (subscribe)                            |
| topics.clessHuntOk          | string | `cless/0/event/huntok`         | Topic pagamento carta autorizzato (subscribe)           |
| commands.clessClose         | string | `cless/0/command/close`        | Topic comando di chiusura transazione (publish)          |
| popupDurationMs             | number | `3000`                          | Durata del messaggio di esito prima del ripristino a IDLE (ms) |

`commands` è una sezione separata da `topics`: la pagina sottoscrive tutti i
valori di `topics` (`Object.values(config.topics)`) ma non deve sottoscriversi
ai comandi che pubblica essa stessa.

---

### StatoConnessione

Derivato dagli eventi del client MQTT. Nessuna persistenza.

| Valore          | Evento MQTT sorgente | Colore indicatore | Etichetta          |
|------------------|------------------------|---------------------|----------------------|
| `connected`      | `connect`              | Verde                | "Connesso"            |
| `reconnecting`   | `reconnect`            | Arancione            | "In riconnessione"    |
| `disconnected`   | `close`                | Rosso                | "Disconnesso"         |

L'indicatore è sempre visibile (posizione fissa, in alto a destra) e non è mai
oscurato dal messaggio di accesso, che non è più un overlay.
