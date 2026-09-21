# Quickstart: Pagamento con Carta di Credito Contactless

**Feature**: 002-pagamento-carta-credito
**Date**: 2026-09-18

Prerequisiti e avvio: identici a `001-validatrice-demo/quickstart.md`. Questa pagina
documenta solo il test manuale del nuovo flusso.

---

## Test manuale senza hardware

```bash
# Simulare pagamento con carta di credito contactless autorizzato
mosquitto_pub -h localhost -p 1883 \
  -t 'cless/0/event/huntok' \
  -m '{"timestamp":"2026-09-18T12:00:00Z","data":{"transactionid":"TX-0001"}}'
```

**Risultato atteso**:
1. Sul monitor appare entro 1 secondo il popup "Addebitati 1,2€, benvenuto".
2. La pagina pubblica `cless/0/command/close` con `data.transactionid = "TX-0001"`
   (verificabile sottoscrivendosi al topic con `mosquitto_sub`):

```bash
mosquitto_sub -h localhost -p 1883 -t 'cless/0/command/close' -v
```

3. Il popup scompare automaticamente dopo 3 secondi (configurabile in `config.js`).

---

## Debug

Console del browser (F12): ogni pubblicazione riuscita produce un log `INFO`
(`📤 Pubblicato cless/0/command/close ...`); un `huntok` senza `transactionid`
produce un `WARN` e nessuna pubblicazione.
