# Feature Specification: Pagamento con Carta di Credito Contactless

**Feature Branch**: `002-pagamento-carta-credito`
**Created**: 2026-09-18
**Status**: Draft
**Input**: User description: "aggiungiamo una user story - l'utente avvicina una carta di credito valida, il display mostra una popup con il messaggio 'Addebitati 1,2€, benvenuto'; il messaggio da ascoltare per questo caso è cless/0/event/huntok, al quale bisogna rispondere con un cless/0/command/close con lo stesso transactionid"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pagamento con carta di credito contactless (Priority: P1)

Un passeggero avvicina una carta di credito contactless valida al lettore. Il
dispositivo riconosce la carta, autorizza l'addebito e segnala l'esito positivo. La
pagina web, aperta sul monitor di demo, rileva l'evento e mostra immediatamente un
popup con il messaggio "Addebitati 1,2€, benvenuto". Contestualmente la pagina conferma
al dispositivo che l'esito è stato ricevuto, così la transazione può essere chiusa
correttamente.

**Why this priority**: È un nuovo metodo di pagamento richiesto per completare la demo,
al pari della validazione con QR e con tessera contactless già previste. Senza la
risposta di chiusura la transazione lato dispositivo resterebbe aperta.

**Independent Test**: Può essere testata pubblicando manualmente un evento MQTT sul
topic `cless/0/event/huntok` (con un identificativo di transazione) e verificando che:
il popup "Addebitati 1,2€, benvenuto" appaia, e che venga pubblicato un comando
`cless/0/command/close` con lo stesso identificativo di transazione ricevuto.

**Acceptance Scenarios**:

1. **Given** la pagina è aperta, connessa al broker e in stato di attesa, **When** il
   lettore contactless autorizza l'addebito e pubblica l'evento `cless/0/event/huntok`
   con un identificativo di transazione, **Then** il popup "Addebitati 1,2€, benvenuto"
   appare entro 1 secondo.
2. **Given** è stato ricevuto l'evento `cless/0/event/huntok` con un identificativo di
   transazione, **When** la pagina lo elabora, **Then** viene pubblicato un comando
   `cless/0/command/close` che riporta esattamente lo stesso identificativo di
   transazione.
3. **Given** il popup "Addebitati 1,2€, benvenuto" è visibile, **When** trascorre
   l'intervallo previsto, **Then** il popup scompare automaticamente e la pagina torna
   allo stato di attesa.
4. **Given** il popup "Addebitati 1,2€, benvenuto" è già visibile, **When** arriva un
   nuovo evento `cless/0/event/huntok` con un diverso identificativo di transazione,
   **Then** il popup viene rinnovato (il timer riparte) e viene pubblicato un nuovo
   comando `cless/0/command/close` con il nuovo identificativo.
5. **Given** è visibile un popup relativo a un'altra modalità di validazione (QR o
   tessera contactless in attesa), **When** arriva l'evento `cless/0/event/huntok`,
   **Then** il popup "Addebitati 1,2€, benvenuto" sostituisce quello precedente e il
   comando di chiusura viene comunque pubblicato correttamente.

---

### Edge Cases

- Se l'evento `cless/0/event/huntok` non contiene un identificativo di transazione
  valido, la pagina NON DEVE pubblicare un comando `cless/0/command/close` malformato;
  l'anomalia viene registrata (log) senza bloccare l'interfaccia né mostrare errori al
  passeggero.
- Se arrivano rapidamente più eventi `cless/0/event/huntok` con identificativi di
  transazione diversi, ogni evento DEVE ricevere il proprio comando di chiusura
  corrispondente, senza perdere o scambiare gli identificativi.
- La pubblicazione del comando `cless/0/command/close` non DEVE dipendere dal fatto che
  il popup sia effettivamente visibile o meno: la risposta protocollare al dispositivo
  ha priorità sulla resa grafica.
- Se il broker non è raggiungibile nel momento in cui arriva l'evento, il comando di
  chiusura DEVE essere inviato non appena la connessione viene ristabilita (nessuna
  perdita silenziosa della risposta).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La pagina DEVE sottoscriversi al topic MQTT `cless/0/event/huntok`.
- **FR-002**: A fronte dell'evento `cless/0/event/huntok`, la pagina DEVE mostrare
  immediatamente il popup con il messaggio "Addebitati 1,2€, benvenuto".
- **FR-003**: A fronte dell'evento `cless/0/event/huntok`, la pagina DEVE pubblicare un
  comando `cless/0/command/close` che riporta lo stesso identificativo di transazione
  ricevuto nell'evento.
- **FR-004**: La pubblicazione del comando `cless/0/command/close` DEVE avvenire anche
  se, per qualsiasi motivo, il popup non viene mostrato (es. un altro popup ha priorità
  visiva nello stesso istante).
- **FR-005**: Il popup "Addebitati 1,2€, benvenuto" DEVE chiudersi automaticamente dopo
  un intervallo di tempo prestabilito, coerente con quello già usato per gli altri
  popup della pagina (default: 3 secondi).
- **FR-006**: Se un nuovo evento `cless/0/event/huntok` arriva mentre il popup di
  pagamento è già visibile, il timer di chiusura automatica DEVE ripartire da zero.
- **FR-007**: Se l'evento `cless/0/event/huntok` non contiene un identificativo di
  transazione, la pagina NON DEVE pubblicare il comando `cless/0/command/close` e DEVE
  registrare l'anomalia senza interrompere il funzionamento della pagina.

### Key Entities

- **Evento pagamento autorizzato (huntok)**: messaggio su `cless/0/event/huntok`;
  indica che il lettore contactless ha autorizzato l'addebito su una carta di credito;
  contiene l'identificativo univoco della transazione.
- **Comando di chiusura transazione (close)**: messaggio pubblicato su
  `cless/0/command/close` in risposta all'evento di autorizzazione; deve riportare lo
  stesso identificativo di transazione ricevuto, per permettere al dispositivo di
  associare la risposta alla transazione corretta.
- **Popup di pagamento**: elemento visivo temporaneo con il messaggio "Addebitati
  1,2€, benvenuto"; si chiude automaticamente dopo l'intervallo configurato, con le
  stesse regole di rinnovo del timer già previste per gli altri popup della pagina.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Il popup "Addebitati 1,2€, benvenuto" appare entro 1 secondo dalla
  ricezione dell'evento `cless/0/event/huntok`.
- **SC-002**: Il 100% degli eventi `cless/0/event/huntok` con identificativo di
  transazione valido riceve un corrispondente comando `cless/0/command/close` con lo
  stesso identificativo, entro 1 secondo dalla ricezione dell'evento.
- **SC-003**: Nessun comando di chiusura viene pubblicato con un identificativo di
  transazione errato o mancante.
- **SC-004**: Il popup si chiude automaticamente senza alcun intervento manuale
  dell'operatore o del passeggero.

## Assumptions

- Il messaggio "Addebitati 1,2€, benvenuto" è un testo fisso a scopo demo, non
  calcolato dinamicamente a partire dall'importo reale della transazione (coerente con
  gli altri popup della pagina, tutti a messaggio fisso).
- L'evento `cless/0/event/huntok` viene emesso dal lettore contactless solo per
  transazioni già autorizzate positivamente; la pagina non deve quindi gestire in questo
  flusso un caso di addebito rifiutato.
- L'identificativo di transazione è presente nel payload `data` dell'evento
  `cless/0/event/huntok`, secondo il formato wrapper già in uso nel progetto
  (`{"timestamp": "ISO8601", "data": {...}}`).
- Questa user story si aggiunge a quelle già previste per la pagina validatrice
  (QR, tessera contactless, indicatore di connessione) e ne condivide le stesse regole
  di comportamento del popup (durata, rinnovo del timer, priorità di sovrascrittura).
