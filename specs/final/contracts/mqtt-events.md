# Contratto MQTT: Validatrice FER — Accesso alla Sala d'Attesa

**Date**: 2026-09-21
**Status**: Riflette lo stato attualmente implementato (`config.js`, `js/app.js`)

Tutti i payload seguono il wrapper standard del progetto:
```json
{ "timestamp": "ISO8601", "data": { ... } }
```

---

## Messaggi sottoscritti dalla pagina (broker → pagina)

### `qr/0/event/read`

Pubblicato dal lettore QR quando un biglietto viene letto.

**Payload**:
```json
{ "timestamp": "2026-09-21T11:30:45Z", "data": {} }
```

Il campo `data` non viene ispezionato: la sola ricezione sul topic fa scattare
la transizione.

**Effetto sulla UI**: transizione → `SUCCESS`, messaggio "Biglietto valido,
accesso autorizzato" (verde, con bordo), ripristino automatico dopo
`popupDurationMs`.

---

### `cless/0/event/validating`

Pubblicato dal driver contactless quando la carta NFC è stata rilevata e la
transazione di validazione è iniziata.

**Payload**:
```json
{ "timestamp": "2026-09-21T11:30:45Z", "data": {} }
```

**Effetto sulla UI**: transizione → `NFC_WAITING` (solo se lo stato corrente è
`IDLE`, altrimenti l'evento viene ignorato), messaggio "Attendere prego..."
(blu, con bordo). Nessun ripristino automatico; timeout di sicurezza a 10s se
non arriva alcun esito.

---

### `cless/0/event/validated`

Pubblicato dal driver contactless quando la transazione NFC si è conclusa con
successo. Arriva circa 300 ms dopo `validating`.

**Payload**:
```json
{ "timestamp": "2026-09-21T11:30:45Z", "data": {} }
```

**Effetto sulla UI**: transizione `NFC_WAITING` → `SUCCESS` (ignorato se lo
stato corrente non è `NFC_WAITING`), messaggio "Biglietto valido, accesso
autorizzato" (verde, con bordo), ripristino automatico dopo `popupDurationMs`.

---

### `cless/0/event/invalid_card`

Pubblicato dal driver contactless in caso di errore di lettura NFC.

**Payload**:
```json
{ "timestamp": "2026-09-21T11:30:45Z", "data": {} }
```

**Effetto sulla UI**: transizione `NFC_WAITING` → `ERROR` (ignorato se lo stato
corrente non è `NFC_WAITING`), messaggio "Titolo di viaggio non valido" (rosso,
con bordo), ripristino automatico dopo `popupDurationMs`. A differenza di
`validated`, l'accesso NON viene concesso.

---

### `cless/0/event/huntok`

Pubblicato dal lettore contactless quando un pagamento con carta di credito
viene autorizzato.

**Payload**:
```json
{ "timestamp": "2026-09-21T11:30:45Z", "data": { "transactionid": "TX-0001" } }
```

| Campo               | Tipo   | Obbligatorio         | Descrizione                                           |
|----------------------|--------|------------------------|----------------------------------------------------------|
| data.transactionid   | string | sì (per rispondere)  | Identificativo univoco della transazione autorizzata     |

Se `transactionid` è assente o vuoto, l'evento produce comunque i messaggi di
pagamento ma NON produce il comando `close` (l'anomalia viene loggata).

**Effetto sulla UI**: transizione → `SUCCESS` (qualsiasi sia lo stato
corrente), in due fasi:
1. subito: messaggio "Pagamento in corso..." (blu, con bordo, stesso stile
   dell'attesa NFC);
2. dopo 500ms, automaticamente (senza attendere un nuovo evento): messaggio
   "Addebitati 1,2€, accesso autorizzato" (verde, con bordo), poi ripristino
   automatico dopo `popupDurationMs`.

Un nuovo evento `huntok` ricevuto durante la fase 1 riparte da capo (nuovo
"Pagamento in corso...", nuovo timer di 500ms).

**Effetto collaterale**: pubblica subito `cless/0/command/close` (vedi sotto),
senza attendere la fase 2 — la pubblicazione non dipende da quale messaggio è
visibile in quel momento.

---

## Messaggi pubblicati dalla pagina (pagina → broker)

### `cless/0/command/close`

Pubblicato in risposta a `cless/0/event/huntok`, per confermare al dispositivo
che l'esito è stato ricevuto e la transazione può essere chiusa.

**Payload**:
```json
{ "timestamp": "2026-09-21T11:30:46Z", "data": { "transactionid": "TX-0001" } }
```

| Campo               | Tipo   | Descrizione                                            |
|----------------------|--------|------------------------------------------------------------|
| timestamp            | string | ISO8601, generato dalla pagina al momento dell'invio        |
| data.transactionid   | string | Stesso valore ricevuto nell'evento `huntok` corrispondente  |

**QoS**: 1.

**Condizioni di non pubblicazione**:
- `cless/0/event/huntok` ricevuto senza `transactionid` valido;
- client MQTT non ancora connesso (`window.mqttClient` non pronto) — in questo
  caso viene solo loggato un `warn`, senza retry automatico del comando.

Tutti gli altri topic sottoscritti dalla pagina (`qr/0/event/read`,
`cless/0/event/validating`, `cless/0/event/validated`,
`cless/0/event/invalid_card`) non generano alcuna pubblicazione: la pagina è in
sola lettura rispetto a essi.
