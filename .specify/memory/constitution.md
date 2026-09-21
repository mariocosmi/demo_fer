<!--
  Sync Impact Report
  Version change: 1.1.0 → 1.2.0 (MINOR: nuovi principi e sezione Bash/MQTT aggiunti)
  Modified principles:
    - V. Osservabilità: esteso a coprire sia la console browser che lo stderr Bash
  Added sections:
    - VI. Convenzioni Bash (nuovo principio)
    - VII. Convenzioni MQTT (nuovo principio)
    - Workflow di Sviluppo: aggiunta sottosezione Componenti del Progetto
  Removed sections: nessuna
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ nessuna modifica necessaria (generico)
    - .specify/templates/spec-template.md ✅ nessuna modifica necessaria (generico)
    - .specify/templates/tasks-template.md ✅ nessuna modifica necessaria (generico)
  Deferred TODOs:
    - RATIFICATION_DATE del progetto originale mantenuta (2025-10-15); la data di
      questa modifica è 2026-03-27.
-->

# Costituzione DEMO FER

## Principi Fondamentali

### I. Lingua Utilizzata

**Regola**: Tutta la documentazione, il codice (commenti, nomi di variabili leggibili,
messaggi utente), e le risposte all'utente DEVONO essere redatti in lingua italiana.

**Motivazione**: Garantisce coerenza comunicativa, facilita la comprensione per il team
italiano, riduce ambiguità interpretative e mantiene uniformità in tutto il progetto.

### II. Architettura Static-First (componente web)

**Regola**: Il sito DEVE essere composto esclusivamente da file HTML/CSS/JS statici
servibili da qualsiasi web server o CDN senza elaborazione server-side.

**Motivazione**: Massima portabilità, zero dipendenze dal server, deployment semplice.
Il comportamento dinamico viene ottenuto solo lato client tramite Web API e MQTT over
WebSocket.

### III. Preferenza per JavaScript Vanilla

**Regola**: Utilizzare JavaScript vanilla di default. Framework/librerie (React, Vue,
jQuery, ecc.) richiedono giustificazione esplicita documentata nella sezione Complexity
Tracking di `plan.md`.

**Motivazione**: Riduce la dimensione del bundle, elimina la complessità di build,
migliora le prestazioni e diminuisce il carico di manutenzione delle dipendenze.

### IV. Build-Free di Default

**Regola**: Nessuno step di build richiesto per lo sviluppo o il deployment, né per
il simulator Bash né per il sito. Se vengono introdotti strumenti di build, documentare
perché l'approccio vanilla era insufficiente.

**Motivazione**: Semplifica il workflow, riduce l'overhead degli strumenti, abilita la
modifica diretta dei file e mantiene cicli di iterazione rapidi.

### V. Osservabilità

**Regola**:
- **Bash**: ogni azione significativa del simulator DEVE produrre output su stderr con
  timestamp e modulo di provenienza (es. `[display] setConfig inviato`).
- **Browser**: tutto ciò che fa il codice JS DEVE essere loggato sulla console tramite
  una libreria di logging configurabile per livello di gravità.

**Motivazione**: Facilita il debugging sia del simulator che del sito, rendendo il flusso
MQTT osservabile senza strumenti aggiuntivi.

### VI. Convenzioni Bash

**Regola**:
- Ogni script Bash DEVE iniziare con `set -euo pipefail`.
- Nessuna dipendenza esterna oltre a `mosquitto_pub`/`mosquitto_sub` e coreutils standard.
- Variabili di configurazione (broker, porta, topic) DEVONO essere dichiarate in cima
  allo script con valori di default espliciti.
- Nessuna logica distribuita su più file: il simulator DEVE rimanere un singolo script
  (`simulator.sh`) salvo giustificazione documentata.

**Motivazione**: Garantisce portabilità, robustezza agli errori e semplicità di
manutenzione. Un singolo script è più facile da distribuire e leggere.

### VII. Convenzioni MQTT

**Regola**:
- Topic pattern: `<driver>/<id>/<direction>/<type>` dove `direction` è `event`
  (driver → app) o `command` (app → driver).
- Tutti i payload DEVONO seguire il wrapper: `{"timestamp": "ISO8601", "data": {...}}`.
- I file `.init.json` DEVONO rispettare questo formato prima di essere pubblicati.
- Nuovi moduli DEVONO seguire lo stesso pattern prima di essere aggiunti al simulator.

**Motivazione**: Coerenza con le convenzioni di `emotikiosk-sncf`; garantisce che il
simulator rimanga compatibile con il sistema reale senza modifiche al protocollo.

## Workflow di Sviluppo

### Componenti del Progetto

| Componente | Stato | Tecnologia |
|---|---|---|
| `simulator.sh` | Esistente | Bash + mosquitto-clients |
| Config files (`*.init.json`) | Esistenti | JSON |
| Sito web | Da sviluppare | HTML/CSS/JS vanilla |

### Organizzazione dei File

```
/
├── simulator.sh             # Simulator MQTT (componente principale attuale)
├── display.init.json        # Config display (non versionato)
├── qr.init.json             # Config QR reader (non versionato)
├── cless.init.json          # Config lettore contactless (non versionato)
├── index.html               # Punto di ingresso sito (da sviluppare)
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── assets/
│   ├── images/
│   └── fonts/
└── specs/                   # Specifiche delle funzionalità (gestite da SpecKit)
```

### Testing

- Il testing del simulator avviene eseguendo `./simulator.sh` con il broker attivo e
  verificando i messaggi MQTT ricevuti dall'applicazione kiosk.
- Il testing manuale nel browser è accettabile per interazioni semplici del sito.
- Il testing automatizzato (se aggiunto) DEVE essere giustificato nel complexity tracking.
- Compatibilità cross-browser: ultime 2 versioni di Chrome, Firefox, Safari, Edge.

### Controllo di Versione

- Effettuare commit di incrementi funzionanti frequentemente.
- I file `.init.json` DEVONO essere versionati insieme al codice.
- Commit diretti su master accettabili per sviluppo in solitaria; usare feature branch
  per collaborazione.

## Governance

### Processo di Modifica

1. Le modifiche proposte DEVONO essere documentate in una spec o plan.
2. Giustificazione del perché i principi attuali sono insufficienti.
3. Costituzione aggiornata con commit e incremento di versione.

### Giustificazione della Complessità

Qualsiasi violazione dei principi fondamentali (aggiunta di framework, strumenti di
build, script multipli, logica server-side) DEVE essere documentata nella sezione
Complexity Tracking del relativo `plan.md` con:
- Quale principio viene violato
- Perché è necessario
- Quale alternativa più semplice è stata rifiutata e perché

### Conformità

- Auto-revisione rispetto ai principi prima di committare funzionalità.
- I comandi SpecKit (`/speckit.plan`, `/speckit.analyze`) verificheranno l'allineamento
  con la costituzione.
- La costituzione è la singola fonte di verità per le decisioni architetturali.

**Versione**: 1.2.1 | **Ratificata**: 2025-10-15 | **Ultima Modifica**: 2026-03-27
