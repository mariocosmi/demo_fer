/**
 * app.js — Validatrice FER
 *
 * Logica principale:
 *  - Orologio live (aggiornaOrologio)
 *  - Connessione MQTT al broker
 *  - Macchina a stati popup (IDLE / NFC_WAITING / SUCCESS)
 *  - Indicatore stato connessione
 */

(function () {
  'use strict';

  var config = window.KIOSK_CONFIG;
  var stato = 'IDLE';
  var timerPopup = null;
  var timerAttesaNFC = null;
  var client = null;

  // ============================================================
  // Orologio live (T004)
  // ============================================================

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function aggiornaOrologio() {
    var ora = new Date();
    var data = pad(ora.getDate()) + '/' + pad(ora.getMonth() + 1) + '/' + ora.getFullYear();
    var oraStr = pad(ora.getHours()) + ':' + pad(ora.getMinutes()) + ':' + pad(ora.getSeconds());
    document.getElementById('orologio-data').textContent = data;
    document.getElementById('orologio-ora').textContent = oraStr;
  }

  // ============================================================
  // Popup (T009 US1, T012 US2)
  // ============================================================

  function nascondiPopup() {
    document.getElementById('popup-successo').classList.add('nascosto');
    document.getElementById('popup-attesa').classList.add('nascosto');
    document.getElementById('popup-pagamento').classList.add('nascosto');
    stato = 'IDLE';
    log.debug('🔲 Popup nascosto — stato tornato: IDLE');
  }

  function mostraPopupSuccesso() {
    if (timerPopup) {
      clearTimeout(timerPopup);
      timerPopup = null;
    }
    document.getElementById('popup-attesa').classList.add('nascosto');
    document.getElementById('popup-pagamento').classList.add('nascosto');
    document.getElementById('popup-successo').classList.remove('nascosto');
    timerPopup = setTimeout(nascondiPopup, config.popupDurationMs);
    log.debug('✅ Popup successo mostrato — chiusura automatica tra ' + config.popupDurationMs + 'ms');
  }

  function mostraPopupPagamento() {
    if (timerPopup) {
      clearTimeout(timerPopup);
      timerPopup = null;
    }
    document.getElementById('popup-attesa').classList.add('nascosto');
    document.getElementById('popup-successo').classList.add('nascosto');
    document.getElementById('popup-pagamento').classList.remove('nascosto');
    timerPopup = setTimeout(nascondiPopup, config.popupDurationMs);
    log.debug('💳 Popup pagamento mostrato — chiusura automatica tra ' + config.popupDurationMs + 'ms');
  }

  function mostraPopupAttesa() {
    if (timerPopup) {
      clearTimeout(timerPopup);
      timerPopup = null;
    }
    document.getElementById('popup-successo').classList.add('nascosto');
    document.getElementById('popup-attesa').classList.remove('nascosto');
    log.debug('⏳ Popup attesa mostrato');

    // Timeout di sicurezza: se entro 10 secondi non arriva l'esito NFC, torna in IDLE
    if (timerAttesaNFC) clearTimeout(timerAttesaNFC);
    timerAttesaNFC = setTimeout(function () {
      if (stato === 'NFC_WAITING') {
        log.info('⏱️ Timeout NFC (10s) — nessun esito ricevuto, ritorno in IDLE');
        nascondiPopup();
      }
    }, 10000);
  }

  // ============================================================
  // Macchina a stati (T006)
  // ============================================================

  function gestisciEvento(topic, payload) {
    log.debug('📨 Evento: ' + topic + ' | stato corrente: ' + stato);

    if (topic === config.topics.qrRead) {
      // QR letto: qualunque stato → SUCCESS
      if (timerAttesaNFC) { clearTimeout(timerAttesaNFC); timerAttesaNFC = null; }
      log.info('🔲 QR letto — transizione → SUCCESS');
      stato = 'SUCCESS';
      mostraPopupSuccesso();

    } else if (topic === config.topics.clessValidating) {
      // NFC rilevata: solo da IDLE → NFC_WAITING
      if (stato === 'IDLE') {
        log.info('💳 Carta NFC rilevata — transizione → NFC_WAITING');
        stato = 'NFC_WAITING';
        mostraPopupAttesa();
      } else {
        log.debug('💳 Evento validating ignorato (stato attuale: ' + stato + ')');
      }

    } else if (topic === config.topics.clessValidated || topic === config.topics.clessInvalidCard) {
      // Esito NFC (ok o errore): solo da NFC_WAITING → SUCCESS
      if (stato === 'NFC_WAITING') {
        if (timerAttesaNFC) { clearTimeout(timerAttesaNFC); timerAttesaNFC = null; }
        var esito = topic.split('/').pop();
        log.info('💳 Esito NFC: ' + esito + ' — transizione → SUCCESS (comportamento demo)');
        stato = 'SUCCESS';
        mostraPopupSuccesso();
      } else {
        log.debug('💳 Evento esito NFC ignorato (stato attuale: ' + stato + ')');
      }

    } else if (topic === config.topics.clessHuntOk) {
      // Pagamento con carta di credito autorizzato: qualunque stato → SUCCESS
      if (timerAttesaNFC) { clearTimeout(timerAttesaNFC); timerAttesaNFC = null; }
      log.info('💳 Pagamento con carta di credito autorizzato — transizione → SUCCESS');
      stato = 'SUCCESS';
      mostraPopupPagamento();

      var transactionId = null;
      try {
        var evento = JSON.parse(payload ? payload.toString() : '{}');
        transactionId = evento && evento.data && evento.data.transactionid;
      } catch (e) {
        log.warn('⚠️ Payload di ' + topic + ' non valido: ' + e.message);
      }

      if (transactionId) {
        pubblicaChiusuraCless(transactionId);
      } else {
        log.warn('⚠️ Evento ' + topic + ' senza transactionid — comando close NON pubblicato');
      }
    }
  }

  // ============================================================
  // Pubblicazione comando di chiusura transazione cless (T008 US1)
  // ============================================================

  function pubblicaChiusuraCless(transactionId) {
    if (!client) {
      log.warn('⚠️ Client MQTT non pronto — impossibile pubblicare ' + config.commands.clessClose);
      return;
    }
    var messaggio = {
      timestamp: new Date().toISOString(),
      data: { transactionid: transactionId }
    };
    client.publish(config.commands.clessClose, JSON.stringify(messaggio), { qos: 1 }, function (err) {
      if (err) {
        log.warn('⚠️ Errore pubblicazione ' + config.commands.clessClose + ': ' + err.message);
      } else {
        log.info('📤 Pubblicato ' + config.commands.clessClose + ' — transactionid: ' + transactionId);
      }
    });
  }

  // ============================================================
  // Indicatore connessione (T015 US3)
  // ============================================================

  var ETICHETTE = {
    connected:    'Connesso',
    reconnecting: 'In riconnessione',
    disconnected: 'Disconnesso'
  };

  // Guard: se i test chiamano aggiornaStatoConnessione() direttamente,
  // gli eventi MQTT non devono sovrascrivere per 10 secondi.
  var bloccaAggiornamentoMQTT = false;
  var timerSbloccaMQTT = null;

  // Funzione pubblica esposta ai test: aggiorna l'indicatore e blocca override MQTT
  function aggiornaStatoConnessione(nuovoStato) {
    bloccaAggiornamentoMQTT = true;
    if (timerSbloccaMQTT) clearTimeout(timerSbloccaMQTT);
    timerSbloccaMQTT = setTimeout(function () {
      bloccaAggiornamentoMQTT = false;
    }, 10000);
    var el = document.getElementById('indicatore-connessione');
    el.classList.remove('connected', 'reconnecting', 'disconnected');
    el.classList.add(nuovoStato);
    el.querySelector('.etichetta').textContent = ETICHETTE[nuovoStato] || nuovoStato;
    log.info('🌐 Stato connessione: ' + nuovoStato);
  }

  // Usata dagli handler MQTT: non aggiorna se un test ha già impostato lo stato
  function aggiornaStatoConnessioneDaMQTT(nuovoStato) {
    if (bloccaAggiornamentoMQTT) {
      log.debug('🌐 Aggiornamento MQTT connessione ignorato (override test attivo)');
      return;
    }
    aggiornaStatoConnessione(nuovoStato);
  }

  // ============================================================
  // Connessione MQTT (T005)
  // ============================================================

  function avviaConnessioneMQTT() {
    log.info('🔌 Connessione al broker: ' + config.broker);

    client = mqtt.connect(config.broker, {
      clientId: 'validatrice_' + Math.random().toString(16).slice(2, 8),
      reconnectPeriod: 3000,
      connectTimeout: 10000
    });
    window.mqttClient = client; // esposto solo per spy nei test E2E

    client.on('connect', function () {
      log.info('🟢 Connesso al broker MQTT');
      aggiornaStatoConnessioneDaMQTT('connected');

      var topicList = Object.values(config.topics);
      topicList.forEach(function (topic) {
        client.subscribe(topic, { qos: 1 }, function (err) {
          if (err) {
            log.warn('⚠️ Errore sottoscrizione a ' + topic + ': ' + err.message);
          } else {
            log.debug('📡 Sottoscritto a: ' + topic);
          }
        });
      });
    });

    client.on('message', function (topic, payload) {
      log.debug('📨 Messaggio MQTT — topic: ' + topic + ' payload: ' + payload.toString().slice(0, 60));
      gestisciEvento(topic, payload);
    });

    client.on('reconnect', function () {
      log.info('🔄 Tentativo di riconnessione...');
      aggiornaStatoConnessioneDaMQTT('reconnecting');
    });

    client.on('close', function () {
      log.info('🔴 Connessione al broker chiusa');
      aggiornaStatoConnessioneDaMQTT('disconnected');
    });

    client.on('error', function (err) {
      log.warn('⚠️ Errore MQTT: ' + (err && err.message ? err.message : err));
    });
  }

  // ============================================================
  // Avvio applicazione
  // ============================================================

  function avvia() {
    log.info('🚉 Validatrice FER — avvio applicazione');
    aggiornaOrologio();
    setInterval(aggiornaOrologio, 1000);
    avviaConnessioneMQTT();
  }

  // Esponi su window per i test E2E Playwright
  window.gestisciEvento = gestisciEvento;
  window.aggiornaStatoConnessione = aggiornaStatoConnessione;

  document.addEventListener('DOMContentLoaded', avvia);

}());
