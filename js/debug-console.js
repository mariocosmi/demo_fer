/**
 * debug-console.js — Shortcut per test manuale da console del browser
 *
 * Espone window.demo.<evento>() per simulare gli eventi MQTT senza broker,
 * chiamando direttamente window.gestisciEvento(topic, payload) come farebbe
 * il client MQTT alla ricezione di un messaggio reale.
 *
 * Esempi:
 *   demo.qrRead()
 *   demo.clessValidating()
 *   demo.clessValidated()
 *   demo.clessInvalidCard()
 *   demo.huntok()                // transactionid generato automaticamente
 *   demo.huntok('TX-0001')       // transactionid esplicito
 *   demo.huntokSenzaId()         // huntok senza transactionid (caso limite)
 */

(function () {
  'use strict';

  var config = window.KIOSK_CONFIG;

  function inviaEvento(topic, data) {
    var payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      data: data || {}
    });
    console.info('🧪 demo → ' + topic, data || {});
    window.gestisciEvento(topic, payload);
  }

  window.demo = {
    qrRead: function () {
      inviaEvento(config.topics.qrRead, {});
    },
    clessValidating: function () {
      inviaEvento(config.topics.clessValidating, {});
    },
    clessValidated: function () {
      inviaEvento(config.topics.clessValidated, {});
    },
    clessInvalidCard: function () {
      inviaEvento(config.topics.clessInvalidCard, {});
    },
    huntok: function (transactionId) {
      transactionId = transactionId || ('TX-' + Date.now());
      inviaEvento(config.topics.clessHuntOk, { transactionid: transactionId });
    },
    huntokSenzaId: function () {
      inviaEvento(config.topics.clessHuntOk, {});
    }
  };

  console.info('🧪 Shortcut di test disponibili: window.demo — vedi js/debug-console.js per la lista');

}());
