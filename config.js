/**
 * config.js — Configurazione Validatrice FER
 *
 * Modificare questo file per adattare broker, topic e timeout
 * senza toccare la logica applicativa.
 */

window.KIOSK_CONFIG = {
  // Indirizzo del broker MQTT (WebSocket)
  broker: 'ws://localhost:9001',

  // Topic MQTT da ascoltare
  topics: {
    qrRead:          'qr/0/event/read',
    clessValidating: 'cless/0/event/validating',
    clessValidated:  'cless/0/event/validated',
    clessInvalidCard:'cless/0/event/invalid_card'
  },

  // Durata del popup di successo in millisecondi
  popupDurationMs: 3000
};
