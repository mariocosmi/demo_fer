# Feature Specification: Pagina Web Validatrice Biglietti

**Feature Branch**: `001-validatrice-demo`
**Created**: 2026-03-27
**Status**: Draft
**Input**: Pagina web di dimostrazione per validatrice di biglietti ferroviari (QR e NFC) con popup MQTT

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Validazione biglietto QR (Priority: P1)

Un passeggero avvicina il proprio biglietto cartaceo con QR code al lettore. Il dispositivo
legge il codice e invia un evento al broker. La pagina web, aperta su un monitor di
dimostrazione, rileva l'evento e mostra immediatamente il messaggio di accesso (sopra
l'orologio) con il testo "Biglietto valido, accesso autorizzato" in verde. Dopo qualche
secondo il messaggio torna a quello di default, pronto per la prossima validazione.

**Why this priority**: È il caso d'uso principale della demo e il più comune nel
contesto ferroviario. Senza questa storia la pagina non ha valore dimostrativo.

**Independent Test**: Può essere testata pubblicando manualmente un evento MQTT sul topic
QR e verificando che il messaggio cambi e torni al default correttamente, senza bisogno
del componente NFC.

**Acceptance Scenarios**:

1. **Given** la pagina è aperta e connessa al broker, **When** il lettore QR legge un
   biglietto e pubblica l'evento, **Then** il messaggio "Biglietto valido, accesso
   autorizzato" (verde) appare entro 1 secondo.
2. **Given** il messaggio di successo è visibile, **When** trascorre l'intervallo previsto,
   **Then** il messaggio torna automaticamente a quello di default e la pagina torna allo
   stato di attesa.
3. **Given** la pagina è connessa al broker, **When** arriva un secondo evento QR mentre
   il messaggio di successo è già visibile, **Then** il timer di ripristino viene rinnovato
   (riparte da zero).

---

### User Story 2 - Validazione tessera contactless (Priority: P2)

Un passeggero avvicina la propria tessera NFC/contactless al lettore. La validazione
avviene in due fasi: prima il lettore rileva la carta e segnala che l'operazione è
iniziata, poi dopo circa 300 ms comunica l'esito. Durante l'attesa la pagina mostra il
messaggio "Attendere prego..." (blu); al termine (con qualsiasi esito, anche errore)
mostra il messaggio "Biglietto valido, accesso autorizzato" (verde). Ai fini della demo
l'esito negativo viene trattato come positivo.

**Why this priority**: Completa la demo con il secondo tipo di biglietto. Il flusso è
più articolato del QR (due eventi, stato intermedio) e richiede gestione della sequenza.

**Independent Test**: Può essere testata pubblicando manualmente in sequenza i due eventi
MQTT (`cless/0/event/validating` poi `cless/0/event/validated` oppure
`cless/0/event/invalid_card`) e verificando che il messaggio passi dai due stati
nell'ordine corretto.

**Acceptance Scenarios**:

1. **Given** la pagina è connessa al broker, **When** arriva l'evento `validating`,
   **Then** il messaggio "Attendere prego..." (blu) appare entro 1 secondo.
2. **Given** il messaggio "Attendere prego..." è visibile, **When** arriva l'evento
   `validated`, **Then** il messaggio si trasforma in "Biglietto valido, accesso
   autorizzato" (verde) e il timer di ripristino automatico parte.
3. **Given** il messaggio "Attendere prego..." è visibile, **When** arriva l'evento
   `invalid_card`, **Then** il messaggio si trasforma ugualmente in "Biglietto valido,
   accesso autorizzato" (comportamento da demo).
4. **Given** il messaggio "Biglietto valido, accesso autorizzato" è visibile (da NFC),
   **When** trascorre l'intervallo previsto, **Then** il messaggio torna automaticamente
   a quello di default.
5. **Given** il messaggio di attesa NFC è visibile, **When** arriva contemporaneamente un
   evento QR, **Then** il messaggio passa direttamente a "Biglietto valido, accesso
   autorizzato".

---

### User Story 3 - Indicatore stato connessione broker (Priority: P3)

L'operatore che allestisce la demo può verificare a colpo d'occhio se la pagina è
correttamente connessa al broker MQTT. Un indicatore visivo sempre presente mostra lo
stato: connesso, disconnesso, in reconnessione.

**Why this priority**: Funzionalità operativa di supporto, non visibile al passeggero
finale ma utile per il setup e il troubleshooting durante la demo.

**Independent Test**: Può essere testata spegnendo e riavviando il broker e verificando
che l'indicatore cambi stato di conseguenza.

**Acceptance Scenarios**:

1. **Given** la pagina è aperta, **When** la connessione al broker è attiva, **Then**
   l'indicatore mostra lo stato "connesso".
2. **Given** la connessione è attiva, **When** il broker diventa irraggiungibile, **Then**
   l'indicatore mostra lo stato "disconnesso" entro 5 secondi.
3. **Given** il broker era irraggiungibile, **When** il broker torna disponibile, **Then**
   la pagina si riconnette automaticamente e l'indicatore torna "connesso".

---

### Edge Cases

- Se il broker non è raggiungibile all'apertura della pagina, la pagina DEVE tentare
  la riconnessione automatica senza bloccarsi o mostrare errori bloccanti al passeggero.
- Se arrivano più eventi in rapida successione, il timer di ripristino viene rinnovato
  ad ogni evento senza sovrapposizioni o incoerenze di stato.
- Il comportamento su dispositivi mobili è fuori scope: la pagina è pensata per un
  monitor desktop fisso da demo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-000**: In stato IDLE la pagina DEVE mostrare:
  - in alto: il logo aziendale (`logoFER.svg`);
  - al centro: la scritta fissa "Accesso con titolo di viaggio valido o carta di
    credito contactless (1,2€)";
  - in basso: data e ora corrente aggiornate in tempo reale.
- **FR-001**: La pagina DEVE connettersi automaticamente al broker MQTT all'avvio,
  senza azione manuale dell'utente.
- **FR-002**: La pagina DEVE sottoscriversi ai seguenti topic MQTT:
  `qr/0/event/read`, `cless/0/event/validating`, `cless/0/event/validated`,
  `cless/0/event/invalid_card`.
- **FR-003**: A fronte dell'evento `qr/0/event/read`, la pagina DEVE mostrare
  immediatamente il messaggio "Biglietto valido, accesso autorizzato" (verde).
- **FR-004**: A fronte dell'evento `cless/0/event/validating`, la pagina DEVE mostrare
  il messaggio "Attendere prego..." (blu) e mantenerlo finché non arriva l'esito.
- **FR-005**: A fronte degli eventi `cless/0/event/validated` o
  `cless/0/event/invalid_card`, la pagina DEVE sostituire il messaggio di attesa con il
  messaggio "Biglietto valido, accesso autorizzato" (in entrambi i casi, ai fini della demo).
- **FR-006**: Il messaggio "Biglietto valido, accesso autorizzato" DEVE tornare
  automaticamente al messaggio di default dopo un intervallo di tempo prestabilito
  (default: 3 secondi).
- **FR-007**: Se un nuovo evento di lettura arriva mentre il messaggio finale è visibile,
  il timer DEVE ripartire da zero.
- **FR-008**: La pagina DEVE mostrare in modo permanente un indicatore visivo dello
  stato di connessione al broker (connesso / disconnesso / in reconnessione).
- **FR-009**: La pagina DEVE tentare la riconnessione automatica al broker in caso di
  disconnessione, senza richiedere il ricaricamento della pagina.
- **FR-010**: L'indirizzo del broker, la porta WebSocket e i topic MQTT DEVONO essere
  configurabili senza modificare il codice sorgente.

### Key Entities

- **Evento QR**: messaggio su `qr/0/event/read`; indica lettura completata, produce
  direttamente il messaggio di successo.
- **Evento NFC — validating**: messaggio su `cless/0/event/validating`; indica che la
  carta è stata rilevata e la validazione è iniziata; produce il messaggio di attesa.
- **Evento NFC — esito**: messaggio su `cless/0/event/validated` o
  `cless/0/event/invalid_card`; chiude la fase di attesa e produce il messaggio di successo.
- **Messaggio di accesso**: unico elemento testuale sopra l'orologio, sempre presente in
  pagina; cambia testo e colore in base allo stato (default, attesa in blu, esito in
  verde) invece di essere un overlay a comparsa.
- **Indicatore di connessione**: elemento permanente in pagina che riflette lo stato
  della connessione al broker MQTT in tempo reale.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Il messaggio di esito/attesa appare entro 1 secondo dalla ricezione
  dell'evento MQTT.
- **SC-002**: Il messaggio torna automaticamente a quello di default dopo l'intervallo
  configurato senza intervento dell'utente.
- **SC-003**: La pagina si riconnette al broker automaticamente dopo una disconnessione,
  senza ricaricare la pagina.
- **SC-004**: Un operatore riesce ad allestire la demo (aprire la pagina e verificare
  il funzionamento) in meno di 2 minuti.
- **SC-005**: La pagina funziona correttamente su Chrome, Firefox, Safari ed Edge
  (ultime 2 versioni).

## Assumptions

- Il broker MQTT è raggiungibile via WebSocket dalla stessa rete locale del browser;
  non è richiesto accesso da internet.
- La pagina è ottimizzata per la WebView del chiosco: risoluzione fissa **600×1024 px**
  (larghezza × altezza, orientamento portrait). Non deve essere presente alcuna scrollbar
  né scrolling verticale o orizzontale.
- I payload degli eventi MQTT seguono il formato wrapper del progetto:
  `{"timestamp": "ISO8601", "data": {...}}`.
- La configurazione (indirizzo broker, porta WebSocket, topic) può essere definita
  tramite un file di configurazione esterno o variabili dichiarate in cima allo script
  JS, senza un pannello di amministrazione dedicato.
- Il messaggio ("Biglietto valido, accesso autorizzato") è fisso e non localizzato
  in questa versione.
