# Quickstart: Pagina Web Validatrice Biglietti

**Feature**: 001-validatrice-demo
**Date**: 2026-03-27

---

## Prerequisiti

- Browser moderno (Chrome, Firefox, Safari o Edge — ultime 2 versioni)
- Broker MQTT attivo su `localhost:9001` (WebSocket)
  - Il broker viene avviato automaticamente dall'applicazione `emotikiosk-sncf`
  - In alternativa: Mosquitto con WebSocket abilitato sulla porta 9001

---

## Avvio della demo

1. Aprire `index.html` nel browser (doppio clic sul file oppure via server HTTP locale)
2. Verificare che l'indicatore di connessione in alto a destra sia **verde**
3. La pagina è pronta per ricevere eventi

---

## Configurazione (opzionale)

Modificare `config.js` per cambiare broker, topic o durata del popup:

```js
window.KIOSK_CONFIG = {
  broker: 'ws://localhost:9001',   // indirizzo del broker
  topics: {
    qrRead:          'qr/0/event/read',
    clessValidating: 'cless/0/event/validating',
    clessValidated:  'cless/0/event/validated',
    clessInvalidCard:'cless/0/event/invalid_card'
  },
  popupDurationMs: 3000            // durata popup successo in ms
};
```

---

## Test manuale senza hardware

Usare `mosquitto_pub` per simulare gli eventi:

```bash
# Simulare lettura QR
mosquitto_pub -h localhost -p 1883 \
  -t 'qr/0/event/read' \
  -m '{"timestamp":"2026-03-27T12:00:00Z","data":{}}'

# Simulare lettura NFC (sequenza completa)
mosquitto_pub -h localhost -p 1883 \
  -t 'cless/0/event/validating' \
  -m '{"timestamp":"2026-03-27T12:00:00Z","data":{}}'

sleep 0.3

mosquitto_pub -h localhost -p 1883 \
  -t 'cless/0/event/validated' \
  -m '{"timestamp":"2026-03-27T12:00:00Z","data":{}}'
```

---

## Debug

Aprire la console del browser (F12). Il livello di log default è `INFO`.

Per aumentare la verbosità durante il debug:
```js
setLogDebug()   // mostra tutti i messaggi inclusi DEBUG e TRACE
setLogInfo()    // torna al livello INFO (default)
setLogWarn()    // mostra solo WARN ed ERROR
```

---

## Struttura dei file

```
demo_fer/
├── index.html        # Aprire questo file
├── config.js         # Configurazione broker e topic
├── css/
│   └── styles.css
└── js/
    ├── mqtt.min.js   # Client MQTT (da emotikiosk-sncf)
    ├── loglevel.min.js
    ├── logger.js
    └── app.js        # Logica principale
```
