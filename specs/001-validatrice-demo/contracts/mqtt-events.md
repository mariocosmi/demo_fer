# Contratti MQTT: Pagina Web Validatrice Biglietti

**Feature**: 001-validatrice-demo
**Date**: 2026-03-27

---

## Evento ricevuti dalla pagina (Subscribe)

La pagina si sottoscrive ai seguenti topic con QoS 1.

### `qr/0/event/read`

Pubblicato dal driver QR quando viene letta un'etichetta con codice a barre o QR.

**Payload**:
```json
{
  "timestamp": "2026-03-27T11:30:45Z",
  "data": { }
}
```

Il campo `data` può contenere qualsiasi payload (il contenuto del QR, ecc.); la pagina
lo ignora. La sola ricezione sul topic fa scattare il popup di successo.

**Effetto sulla UI**: transizione → `SUCCESS`, popup "Biglietto valido, buon viaggio!".

---

### `cless/0/event/validating`

Pubblicato dal driver contactless quando la carta NFC è stata rilevata e la
transazione è iniziata.

**Payload**:
```json
{
  "timestamp": "2026-03-27T11:30:45Z",
  "data": { }
}
```

**Effetto sulla UI**: transizione → `NFC_WAITING`, popup "Attendere prego...".

---

### `cless/0/event/validated`

Pubblicato dal driver contactless quando la transazione NFC si è conclusa con successo.
Arriva circa 300 ms dopo `validating`.

**Payload**:
```json
{
  "timestamp": "2026-03-27T11:30:45Z",
  "data": { }
}
```

**Effetto sulla UI**: transizione `NFC_WAITING` → `SUCCESS`, popup "Biglietto valido, buon viaggio!".

---

### `cless/0/event/invalid_card`

Pubblicato dal driver contactless in caso di errore di lettura NFC.

**Payload**:
```json
{
  "timestamp": "2026-03-27T11:30:45Z",
  "data": { }
}
```

**Effetto sulla UI**: identico a `validated` ai fini della demo — transizione
`NFC_WAITING` → `SUCCESS`, popup "Biglietto valido, buon viaggio!".

---

## Messaggi NON pubblicati dalla pagina

La pagina è in sola lettura rispetto al broker: non pubblica alcun messaggio MQTT.

---

## Configurazione connessione

| Parametro        | Valore default          |
|------------------|-------------------------|
| URL broker       | `ws://localhost:9001`   |
| Protocollo       | MQTT 3.1.1 over WebSocket |
| QoS Subscribe    | 1 (at least once)       |
| Client ID        | `validatrice_<random>`  |
| Reconnect period | 3000 ms                 |
| Connect timeout  | 10000 ms                |
