# Feature Specification: Validatrice FER — Accesso alla Sala d'Attesa

**Date**: 2026-09-21
**Status**: Riflette lo stato attualmente implementato nel repository

**Nota**: Questo documento consolida e sostituisce, come descrizione dello stato
**attuale**, le specifiche incrementali `001-validatrice-demo/spec.md` e
`002-pagamento-carta-credito/spec.md`, che restano nel repository come registro
storico di come la feature si è evoluta (popup a schermo intero → messaggio
inline; testi "viaggio" → "accesso alla sala d'attesa"; ecc.). Per la cronologia
delle decisioni fare riferimento a quei documenti; per il comportamento corrente
fare riferimento a questo.

## Contesto

Pagina web di dimostrazione, mostrata su un monitor fisso da chiosco (risoluzione
fissa 600×1024 px, portrait), che simula l'accesso a una sala d'attesa ferroviaria.
L'accesso è concesso in due modi alternativi:
- validazione di un titolo di viaggio (QR o tessera contactless/NFC);
- pagamento diretto con carta di credito contactless (1,2€).

La pagina non convalida nulla autonomamente: si limita a reagire agli eventi MQTT
pubblicati dai lettori (QR, NFC, carta di credito) e a mostrare il relativo
messaggio di accesso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Validazione biglietto QR (Priority: P1)

Un passeggero avvicina il proprio biglietto cartaceo con QR code al lettore. Il
dispositivo legge il codice e invia un evento al broker. La pagina rileva l'evento
e mostra immediatamente il messaggio di accesso (sopra l'orologio) con il testo
"Biglietto valido, accesso autorizzato", in verde e racchiuso in un bordo
arrotondato di rinforzo. Dopo qualche secondo il messaggio torna a quello di
default, pronto per la prossima validazione.

**Acceptance Scenarios**:

1. **Given** la pagina è aperta e connessa al broker, **When** il lettore QR legge
   un biglietto e pubblica l'evento, **Then** il messaggio "Biglietto valido,
   accesso autorizzato" (verde, con bordo) appare entro 1 secondo.
2. **Given** il messaggio di successo è visibile, **When** trascorre l'intervallo
   previsto (default 3s), **Then** il messaggio torna automaticamente a quello di
   default (senza bordo) e la pagina torna allo stato di attesa.
3. **Given** la pagina è connessa al broker, **When** arriva un secondo evento QR
   mentre il messaggio di successo è già visibile, **Then** il timer di ripristino
   viene rinnovato (riparte da zero).

---

### User Story 2 - Validazione tessera contactless (NFC) (Priority: P2)

Un passeggero avvicina la propria tessera NFC/contactless al lettore. La
validazione avviene in due fasi: prima il lettore rileva la carta e segnala che
l'operazione è iniziata, poi dopo circa 300 ms comunica l'esito. Durante l'attesa
la pagina mostra il messaggio "Attendere prego..." (blu, con bordo); se l'esito è
positivo mostra "Biglietto valido, accesso autorizzato" (verde, con bordo); se
l'esito è negativo mostra "Titolo di viaggio non valido" (rosso, con bordo) —
a differenza di QR e NFC positivo, in questo caso l'accesso NON viene concesso.

**Acceptance Scenarios**:

1. **Given** la pagina è connessa al broker, **When** arriva l'evento
   `cless/0/event/validating`, **Then** il messaggio "Attendere prego..." (blu)
   appare entro 1 secondo e non ha un timer di ripristino autonomo.
2. **Given** il messaggio "Attendere prego..." è visibile, **When** arriva l'evento
   `cless/0/event/validated`, **Then** il messaggio si trasforma in "Biglietto
   valido, accesso autorizzato" (verde) e il timer di ripristino automatico parte.
3. **Given** il messaggio "Attendere prego..." è visibile, **When** arriva l'evento
   `cless/0/event/invalid_card`, **Then** il messaggio si trasforma in "Titolo di
   viaggio non valido" (rosso) e il timer di ripristino automatico parte.
4. **Given** il messaggio di attesa NFC è visibile, **When** arriva
   contemporaneamente un evento QR, **Then** il messaggio passa direttamente a
   "Biglietto valido, accesso autorizzato".
5. **Given** la pagina NON è in attesa di un esito NFC (stato `IDLE`, `SUCCESS` o
   `ERROR`), **When** arriva un evento `cless/0/event/validated` o
   `cless/0/event/invalid_card` "fuori sequenza", **Then** l'evento viene
   ignorato e il messaggio corrente non cambia.

---

### User Story 3 - Pagamento con carta di credito contactless (Priority: P1)

Un passeggero avvicina una carta di credito contactless valida al lettore. Il
dispositivo riconosce la carta, autorizza l'addebito di 1,2€ e segnala l'esito
positivo pubblicando `cless/0/event/huntok` con un identificativo di transazione.
La pagina mostra subito il messaggio "Pagamento in corso..." (blu, con bordo,
stesso stile dell'attesa NFC) e, senza attendere alcun nuovo evento, dopo mezzo
secondo passa automaticamente al messaggio "Addebitati 1,2€, accesso
autorizzato" (verde, con bordo). Contestualmente, e indipendentemente da quale
messaggio è visibile in quel momento, la pagina pubblica un comando
`cless/0/command/close` che riporta lo stesso identificativo di transazione, per
confermare al dispositivo che l'esito è stato ricevuto e la transazione può essere
chiusa.

**Acceptance Scenarios**:

1. **Given** la pagina è aperta, connessa al broker e in stato di attesa, **When**
   il lettore contactless autorizza l'addebito e pubblica `cless/0/event/huntok`
   con un identificativo di transazione, **Then** il messaggio "Pagamento in
   corso..." (blu, con bordo) appare entro 1 secondo.
2. **Given** il messaggio "Pagamento in corso..." è visibile, **When** trascorrono
   500ms senza che sia necessario alcun nuovo evento, **Then** il messaggio passa
   automaticamente a "Addebitati 1,2€, accesso autorizzato" (verde, con bordo).
3. **Given** è stato ricevuto l'evento `cless/0/event/huntok` con un identificativo
   di transazione, **When** la pagina lo elabora, **Then** viene pubblicato subito
   un comando `cless/0/command/close` che riporta esattamente lo stesso
   identificativo — la pubblicazione non attende il passaggio al messaggio di
   successo.
4. **Given** il messaggio "Addebitati 1,2€, accesso autorizzato" è visibile,
   **When** trascorre l'intervallo previsto (default 3s), **Then** il messaggio
   torna automaticamente a quello di default.
5. **Given** il messaggio "Pagamento in corso..." o "Addebitati 1,2€, accesso
   autorizzato" è già visibile, **When** arriva un nuovo evento `huntok` con un
   diverso identificativo di transazione, **Then** il ciclo riparte da capo
   ("Pagamento in corso..." → 500ms → successo) e viene pubblicato un nuovo
   comando `close` con il nuovo identificativo.
6. **Given** è visibile un messaggio relativo a un'altra modalità di validazione
   (QR o tessera contactless in attesa), **When** arriva l'evento `huntok`,
   **Then** il messaggio "Pagamento in corso..." sostituisce quello precedente e
   il comando di chiusura viene comunque pubblicato correttamente.
7. **Given** l'evento `huntok` non contiene un identificativo di transazione
   valido, **When** la pagina lo elabora, **Then** i messaggi "Pagamento in
   corso..." e di successo appaiono comunque, ma NESSUN comando `close` viene
   pubblicato; l'anomalia viene registrata in log.

---

### User Story 4 - Indicatore stato connessione broker (Priority: P3)

L'operatore che allestisce la demo può verificare a colpo d'occhio se la pagina è
correttamente connessa al broker MQTT. Un indicatore visivo permanente, in alto a
destra, mostra lo stato: connesso (verde), disconnesso (rosso), in riconnessione
(arancione).

**Acceptance Scenarios**:

1. **Given** la pagina è aperta, **When** la connessione al broker è attiva,
   **Then** l'indicatore mostra lo stato "connesso".
2. **Given** la connessione è attiva, **When** il broker diventa irraggiungibile,
   **Then** l'indicatore mostra lo stato "disconnesso".
3. **Given** il broker era irraggiungibile, **When** torna disponibile, **Then**
   la pagina si riconnette automaticamente e l'indicatore torna "connesso".
4. **Given** un messaggio di attesa/esito è visibile, **When** cambia lo stato
   della connessione, **Then** l'indicatore resta sempre visibile e leggibile,
   indipendentemente da cosa mostra il messaggio di accesso.

---

### Edge Cases

- Se il broker non è raggiungibile all'apertura della pagina, la pagina DEVE
  tentare la riconnessione automatica senza bloccarsi o mostrare errori bloccanti.
- Se arrivano più eventi in rapida successione (stesso tipo o tipi diversi), il
  messaggio e il relativo timer di ripristino DEVONO riflettere sempre l'evento
  più recente, senza incoerenze di stato.
- Il comportamento su dispositivi mobili è fuori scope: la pagina è pensata per un
  monitor desktop fisso da demo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In stato IDLE la pagina DEVE mostrare: in alto il logo aziendale;
  al centro il messaggio fisso "Accesso con titolo di viaggio valido o carta di
  credito contactless (1,2€)" (senza bordo); in basso data e ora correnti,
  aggiornate in tempo reale.
- **FR-002**: La pagina DEVE connettersi automaticamente al broker MQTT
  all'avvio, senza azione manuale.
- **FR-003**: La pagina DEVE sottoscriversi ai topic: `qr/0/event/read`,
  `cless/0/event/validating`, `cless/0/event/validated`,
  `cless/0/event/invalid_card`, `cless/0/event/huntok`.
- **FR-004**: A fronte di `qr/0/event/read`, la pagina DEVE mostrare
  immediatamente il messaggio "Biglietto valido, accesso autorizzato" (verde).
- **FR-005**: A fronte di `cless/0/event/validating`, la pagina DEVE mostrare il
  messaggio "Attendere prego..." (blu) e mantenerlo finché non arriva l'esito.
- **FR-006**: A fronte di `cless/0/event/validated`, la pagina DEVE sostituire il
  messaggio di attesa con "Biglietto valido, accesso autorizzato" (verde).
- **FR-006a**: A fronte di `cless/0/event/invalid_card`, la pagina DEVE
  sostituire il messaggio di attesa con "Titolo di viaggio non valido" (rosso).
  A differenza degli altri esiti, l'accesso NON viene concesso.
- **FR-007**: A fronte di `cless/0/event/huntok`, la pagina DEVE mostrare
  immediatamente il messaggio "Pagamento in corso..." (blu, stesso stile
  dell'attesa NFC) e, senza attendere alcun nuovo evento, DEVE passare
  automaticamente al messaggio "Addebitati 1,2€, accesso autorizzato" (verde)
  dopo un intervallo fisso di 500ms.
- **FR-007a**: A fronte di `cless/0/event/huntok`, la pagina DEVE pubblicare
  subito (senza attendere il passaggio al messaggio di successo) un comando
  `cless/0/command/close` che riporta lo stesso identificativo di transazione
  ricevuto in `data.transactionid`.
- **FR-008**: Se `cless/0/event/huntok` non contiene un identificativo di
  transazione, la pagina NON DEVE pubblicare il comando `close` e DEVE registrare
  l'anomalia senza interrompere il funzionamento della pagina (i messaggi
  "Pagamento in corso..." e di successo vengono comunque mostrati).
- **FR-009**: I messaggi "Attendere prego...", "Pagamento in corso...",
  "Biglietto valido, accesso autorizzato", "Addebitati 1,2€, accesso
  autorizzato" e "Titolo di viaggio non valido" DEVONO essere racchiusi in un
  bordo arrotondato di rinforzo visivo; il messaggio di default in stato IDLE
  NON deve avere bordo.
- **FR-010**: I messaggi "Biglietto valido, accesso autorizzato", "Addebitati
  1,2€, accesso autorizzato" e "Titolo di viaggio non valido" DEVONO tornare
  automaticamente al messaggio di default dopo un intervallo di tempo
  configurabile (default: 3 secondi).
- **FR-011**: Se un nuovo evento di lettura/pagamento arriva mentre un messaggio
  di esito è già visibile, il timer di ripristino DEVE ripartire da zero.
- **FR-012**: La pubblicazione del comando `cless/0/command/close` NON DEVE
  dipendere da quale messaggio è visibile in quel momento: la risposta
  protocollare al dispositivo ha priorità sulla resa grafica.
- **FR-013**: La pagina DEVE mostrare in modo permanente un indicatore visivo
  dello stato di connessione al broker (connesso / disconnesso / in
  riconnessione), sempre visibile indipendentemente dallo stato del messaggio di
  accesso.
- **FR-014**: La pagina DEVE tentare la riconnessione automatica al broker in
  caso di disconnessione, senza richiedere il ricaricamento della pagina.
- **FR-015**: L'indirizzo del broker, la porta WebSocket, i topic e il comando
  MQTT DEVONO essere configurabili senza modificare il codice sorgente
  applicativo (`config.js`).

### Key Entities

- **Messaggio di accesso**: unico elemento testuale sopra l'orologio, sempre
  presente in pagina (nessun overlay a schermo intero). Cambia testo, colore e
  presenza del bordo in base allo stato corrente.
- **Evento QR**: `qr/0/event/read`; produce direttamente il messaggio di
  successo.
- **Evento NFC — validating**: `cless/0/event/validating`; apre la fase di
  attesa.
- **Evento NFC — esito positivo**: `cless/0/event/validated`; chiude la fase di
  attesa e produce il messaggio di successo (verde), accesso concesso.
- **Evento NFC — esito negativo**: `cless/0/event/invalid_card`; chiude la fase
  di attesa e produce il messaggio di errore "Titolo di viaggio non valido"
  (rosso), accesso NON concesso.
- **Evento pagamento autorizzato (huntok)**: `cless/0/event/huntok`; indica
  addebito autorizzato su carta di credito; contiene l'identificativo univoco
  della transazione; apre la fase "Pagamento in corso..." (500ms, blu) prima del
  messaggio di successo (verde).
- **Comando di chiusura transazione (close)**: `cless/0/command/close`,
  pubblicato dalla pagina in risposta a `huntok`, con lo stesso identificativo di
  transazione ricevuto.
- **Indicatore di connessione**: elemento permanente che riflette lo stato della
  connessione al broker MQTT in tempo reale.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ogni messaggio di attesa/esito appare entro 1 secondo dalla
  ricezione dell'evento MQTT corrispondente.
- **SC-002**: Il 100% degli eventi `cless/0/event/huntok` con identificativo di
  transazione valido riceve un corrispondente comando `close` con lo stesso
  identificativo, entro 1 secondo.
- **SC-003**: Nessun comando `close` viene pubblicato con un identificativo di
  transazione errato, scambiato o mancante.
- **SC-004**: Ogni messaggio di esito (successo, pagamento o errore) torna
  automaticamente al messaggio di default dopo l'intervallo configurato, senza
  intervento manuale.
- **SC-005**: La pagina si riconnette al broker automaticamente dopo una
  disconnessione, senza ricaricare la pagina.
- **SC-006**: La pagina funziona correttamente su Chrome, Firefox, Safari ed Edge
  (ultime 2 versioni), senza scrollbar né overflow a 600×1024 px.

## Assumptions

- Il broker MQTT è raggiungibile via WebSocket dalla stessa rete locale del
  browser; non è richiesto accesso da internet.
- La pagina è ottimizzata per la WebView del chiosco: risoluzione fissa
  **600×1024 px** (portrait), senza scrolling.
- I payload degli eventi MQTT seguono il formato wrapper del progetto:
  `{"timestamp": "ISO8601", "data": {...}}`.
- Tutti i testi dei messaggi sono fissi a scopo demo, non calcolati
  dinamicamente (l'importo "1,2€" non deriva dalla transazione reale).
- L'evento `cless/0/event/huntok` viene emesso dal lettore solo per transazioni
  già autorizzate positivamente; non è previsto un flusso di addebito rifiutato.
