/**
 * logger.js — Sistema di log minimale per la Validatrice FER
 *
 * Livelli disponibili (in ordine crescente di gravità):
 *   trace < debug < info < warn < error < silent
 *
 * Default: info (mostra info, warn, error; nasconde trace e debug)
 *
 * Per cambiare livello dalla console del browser:
 *   log.setLevel("debug") | "info" | "warn" | "error" | "silent"
 */

(function () {
  var LIVELLI = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, silent: 5 };

  var nomeLivelloSalvato = localStorage.getItem('validatrice-log-level') || 'info';
  var livelloAttivo = LIVELLI[nomeLivelloSalvato] !== undefined
    ? LIVELLI[nomeLivelloSalvato]
    : LIVELLI.info;

  function oraCorrente() {
    return new Date().toLocaleTimeString('it-IT');
  }

  function creaMetodo(nome, livello, metodoConsole) {
    return function () {
      if (livello < livelloAttivo) return;
      var prefisso = '[' + oraCorrente() + '] [' + nome.toUpperCase() + ']';
      var args = [prefisso];
      for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
      metodoConsole.apply(console, args);
    };
  }

  var log = {
    trace: creaMetodo('trace', LIVELLI.trace, console.log),
    debug: creaMetodo('debug', LIVELLI.debug, console.log),
    info:  creaMetodo('info',  LIVELLI.info,  console.info),
    warn:  creaMetodo('warn',  LIVELLI.warn,  console.warn),
    error: creaMetodo('error', LIVELLI.error, console.error),

    setLevel: function (nome) {
      if (LIVELLI[nome] === undefined) {
        console.warn('[logger] Livello non riconosciuto: ' + nome);
        return;
      }
      livelloAttivo = LIVELLI[nome];
      nomeLivelloSalvato = nome;
      localStorage.setItem('validatrice-log-level', nome);
    }
  };

  window.log = log;
  window.logger = log;

  // Helper rapidi per la console del browser
  window.setLogDebug = function () { log.setLevel('debug'); log.info('Livello logging cambiato a DEBUG'); };
  window.setLogInfo  = function () { log.setLevel('info');  log.info('Livello logging cambiato a INFO'); };
  window.setLogWarn  = function () { log.setLevel('warn');  log.warn('Livello logging cambiato a WARN'); };

  log.info('Logger inizializzato — livello: ' + nomeLivelloSalvato);
  log.info('Per cambiare livello: log.setLevel("debug") | "info" | "warn" | "error"');
})();
