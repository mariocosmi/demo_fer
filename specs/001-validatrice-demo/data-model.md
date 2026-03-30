# Data Model: Pagina Web Validatrice Biglietti

**Feature**: 001-validatrice-demo
**Date**: 2026-03-27

---

## Entità principali

### EventoMQTT

Messaggio ricevuto dal broker. La pagina legge solo il campo `data` del payload.

| Campo     | Tipo   | Descrizione                                      |
|-----------|--------|--------------------------------------------------|
| timestamp | string | ISO8601, generato dal driver (non usato dalla UI)|
| data      | object | Payload specifico del driver (opaco per la UI)  |

**Topic attesi**:
- `qr/0/event/read`
- `cless/0/event/validating`
- `cless/0/event/validated`
- `cless/0/event/invalid_card`

La pagina non ispeziona il contenuto di `data`: la sola ricezione sul topic corretto
è sufficiente a triggerare la transizione di stato.

---

### StatoPopup (macchina a stati)

Stato interno dell'applicazione che governa cosa è visibile a schermo.

| Stato       | Descrizione                                         | Schermo                                                      |
|-------------|-----------------------------------------------------|--------------------------------------------------------------|
| IDLE        | Nessuna lettura in corso, pagina in attesa          | Logo FER in alto — data/ora al centro — "Validare il titolo di viaggio" in basso |
| NFC_WAITING | Carta NFC rilevata, validazione in corso            | Layout IDLE + overlay popup "Attendere prego..."             |
| SUCCESS     | Lettura completata (QR o NFC, qualsiasi esito demo) | Layout IDLE + overlay popup "Biglietto valido, buon viaggio!" |

**Transizioni** → vedi `research.md § 4`.

---

### Configurazione (`window.KIOSK_CONFIG`)

Oggetto globale letto all'avvio. Nessuna persistenza richiesta.

| Campo                    | Tipo   | Default                      | Descrizione              |
|--------------------------|--------|------------------------------|--------------------------|
| broker                   | string | `ws://localhost:9001`        | URL WebSocket del broker |
| topics.qrRead            | string | `qr/0/event/read`            | Topic lettura QR         |
| topics.clessValidating   | string | `cless/0/event/validating`   | Topic NFC rilevata       |
| topics.clessValidated    | string | `cless/0/event/validated`    | Topic NFC validata       |
| topics.clessInvalidCard  | string | `cless/0/event/invalid_card` | Topic NFC errore         |
| popupDurationMs          | number | `3000`                       | Durata popup successo    |

---

### StatoConnessione

Derivato dagli eventi del client MQTT. Nessuna persistenza.

| Valore        | Evento MQTT sorgente | Colore indicatore |
|---------------|----------------------|-------------------|
| `connected`   | `connect`            | Verde             |
| `reconnecting`| `reconnect`          | Arancione         |
| `disconnected`| `close`              | Rosso             |
