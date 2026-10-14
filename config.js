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
    clessInvalidCard:'cless/0/event/invalid_card',
    clessHuntOk:     'cless/0/event/huntok'
  },

  // Comandi MQTT pubblicati dalla pagina (non vanno sottoscritti)
  commands: {
    clessClose: 'cless/0/command/close',
    audioPlay:  'audio/0/command/play'
  },

  // Suoni degli esiti, riprodotti sul validatore da emotikiosk (cartella sounds).
  // WebKit in cog blocca l'audio della pagina senza un tocco sullo schermo, per questo
  // la pagina non suona da sé. File vuoto = nessun suono per quell'esito.
  audio: {
    ok: 'sound_ok.wav',
    ko: 'sound_ko.wav'
  },

  // Durata del popup di successo in millisecondi
  popupDurationMs: 3000
};
