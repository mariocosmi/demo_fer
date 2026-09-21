# Contratti MQTT: Pagamento con Carta di Credito Contactless

**Feature**: 002-pagamento-carta-credito
**Date**: 2026-09-18

Estende `specs/001-validatrice-demo/contracts/mqtt-events.md` con un nuovo evento in
ricezione e, per la prima volta, un comando pubblicato dalla pagina.

---

## Evento ricevuto dalla pagina (Subscribe)

### `cless/0/event/huntok`

Pubblicato dal driver contactless quando l'addebito su una carta di credito è stato
autorizzato con successo.

**Payload**:
```json
{
  "timestamp": "2026-09-18T11:30:45Z",
  "data": { "transactionid": "TX-0001" }
}
```

**Effetto sulla UI**: transizione → `SUCCESS`, messaggio "Addebitati 1,2€, accesso autorizzato" (verde).

**Effetto lato protocollo**: la pagina pubblica `cless/0/command/close` (vedi sotto)
riportando lo stesso `transactionid`.

---

## Comando pubblicato dalla pagina (Publish) — novità

### `cless/0/command/close`

Pubblicato dalla pagina in risposta a `cless/0/event/huntok`, per confermare al
driver la chiusura della transazione.

**Payload**:
```json
{
  "timestamp": "2026-09-18T11:30:45Z",
  "data": { "transactionid": "TX-0001" }
}
```

**Regola di correlazione**: `data.transactionid` DEVE essere identico a quello
ricevuto nell'evento `huntok` che ha generato la pubblicazione.

**QoS**: 1 (at least once), coerente con le subscribe già in uso.

**Se l'evento `huntok` non contiene `transactionid`**: il comando `close` NON viene
pubblicato; l'anomalia viene solo loggata in console.

---

## Messaggi NON pubblicati dalla pagina

Rimane valido tutto quanto descritto in `001-validatrice-demo`: la pagina non
pubblica nulla su `qr/0/command/*`, `cless/0/command/setConfig`,
`display/0/command/*`, ecc. `cless/0/command/close` è l'unico comando pubblicato,
esclusivamente in risposta a `cless/0/event/huntok`.
