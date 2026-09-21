# Specification Analysis Report — `002-pagamento-carta-credito`

**Data**: 2026-09-18
**Generato da**: `/speckit.analyze` (analisi read-only di `spec.md`, `plan.md`, `tasks.md`)
**Stato implementazione al momento dell'analisi**: US1 implementata e testata (50/50 test Playwright passano); nessuna remediation applicata.

**Artifacts analizzati**: `spec.md`, `plan.md`, `tasks.md` (+ `data-model.md`, `contracts/mqtt-events.md`, `research.md`, `quickstart.md` come supporto) e `.specify/memory/constitution.md` (v1.2.1).

| ID | Categoria | Severità | Posizione(i) | Sintesi | Raccomandazione | Stato |
|----|-----------|----------|--------------|---------|------------------|-------|
| C1 | Constitution | **CRITICAL** | `plan.md` § Complexity Tracking (vuota); `constitution.md` L129 | Il testing automatizzato (Playwright, incl. il nuovo `tests/e2e/us4-pagamento-carta.spec.js`) non è mai stato giustificato nella sezione Complexity Tracking di alcun `plan.md` (né in 001 né in 002), mentre la costituzione impone: *"Il testing automatizzato (se aggiunto) DEVE essere giustificato nel complexity tracking."* | Aggiungere una riga in Complexity Tracking di `plan.md` (anche di 001) che giustifichi l'uso di Playwright rispetto al "testing manuale" di default previsto dalla costituzione. | Da fare |
| G1 | Coverage Gap | HIGH | `spec.md` L45-48 (Acceptance Scenario 5); `tasks.md` T004; `tests/e2e/us4-pagamento-carta.spec.js` US4-06/US4-07 | L'Acceptance Scenario 5 richiede che, quando `huntok` sovrascrive un altro popup visibile, "il comando di chiusura viene comunque pubblicato correttamente". I test US4-06/US4-07 verificano solo il cambio di popup, non che `cless/0/command/close` sia stato pubblicato con il `transactionid` corretto in quello scenario. | Estendere US4-06/US4-07 (o aggiungerne di nuovi) con un assert su `window.__publishCalls` per verificare la pubblicazione anche nei casi di sovrascrittura. | Da fare |
| U1 | Underspecification | MEDIUM | `spec.md` FR-004 (L78-80); `js/app.js` (ramo `huntok`, T009) | FR-004 richiede che la pubblicazione di `close` sia indipendente dal fatto che il popup venga mostrato. Nell'implementazione, `mostraPopupPagamento()` viene chiamata **prima** del parsing/pubblicazione: se il rendering del popup lanciasse un'eccezione, la pubblicazione non avverrebbe mai, contraddicendo strutturalmente l'intento di FR-004. Nessun task/test esercita questo scenario. | Spostare/isolare la logica di pubblicazione così che non dipenda dall'esito di `mostraPopupPagamento()` (es. `try/catch` separati), oppure documentare che l'indipendenza è solo concettuale e non testata. | Da fare |
| A1 | Ambiguity | MEDIUM | `spec.md` SC-003 (L112-113) | SC-003 vieta la pubblicazione di `close` con identificativo "errato o mancante", ma solo il caso "mancante" è specificato (FR-007, check di verità). Non è definito cosa renda un `transactionid` "errato" (tipo non stringa, oggetto, booleano, stringa vuota già gestita come falsy) né esiste un acceptance scenario o test per un `transactionid` malformato ma presente. | Chiarire SC-003 restringendolo a "mancante", oppure aggiungere una regola esplicita di validazione (es. deve essere una stringa non vuota) con relativo FR e test. | Da fare |
| I1 | Inconsistency | LOW | `tasks.md` L81 (sezione Dipendenze) | La dipendenza dichiarata "Fondamenta (Phase 2) dipende da T001 solo per coerenza di config" è imprecisa: T002/T003 sono refactor di `js/app.js` indipendenti dal contenuto di `config.js` e non hanno una reale dipendenza da T001. | Correggere la nota di dipendenza o rimuoverla, per non suggerire un vincolo di esecuzione inesistente. | Da fare |
| G2 | Coverage Gap | LOW | `spec.md` SC-002 (L109-111); `tests/e2e/us4-pagamento-carta.spec.js` US4-08 | SC-002 richiede che il comando `close` sia pubblicato "entro 1 secondo". Nessun test asserisce esplicitamente un vincolo temporale sulla chiamata `publish` (solo US4-03 misura il timing del popup). Rischio basso perché la pubblicazione è sincrona, ma il criterio non è verificato esplicitamente. | Aggiungere un'asserzione di timing sulla `publish`, oppure annotare in `tasks.md`/`quickstart.md` che è implicitamente soddisfatto dall'esecuzione sincrona. | Da fare |

## Coverage Summary Table

| Requirement Key | Has Task? | Task IDs | Note |
|---|---|---|---|
| FR-001 (subscribe huntok) | ✅ | T001 (+ loop di subscribe esistente, non un task dedicato) | Copertura implicita tramite `Object.values(config.topics)` |
| FR-002 (mostra popup) | ✅ | T005, T007, T009 | — |
| FR-003 (publish close con transactionid) | ✅ | T008, T009 | Caso di sovrascrittura non testato — vedi G1 |
| FR-004 (publish indipendente dal popup) | ⚠️ | T009 | Copertura debole — vedi U1 |
| FR-005 (auto-chiusura popup) | ✅ | T007 | — |
| FR-006 (rinnovo timer) | ✅ | T007, T009 | — |
| FR-007 (no publish senza transactionid) | ✅ | T009 | — |
| SC-001 (popup entro 1s) | ✅ | T004 (US4-03) | — |
| SC-002 (close entro 1s) | ⚠️ | T004 | Timing non asserito esplicitamente — vedi G2 |
| SC-003 (nessun close errato/mancante) | ⚠️ | T004 (US4-10) | Solo caso "mancante" testato — vedi A1 |
| SC-004 (chiusura automatica senza intervento) | ✅ | T004 (US4-04) | — |

## Constitution Alignment Issues

Vedi C1 (unica violazione rilevata).

## Unmapped Tasks

Nessuno — T006, T010, T011 sono task di supporto (stile, validazione) chiaramente riconducibili a FR-002 e alla verifica generale, non requisiti orfani.

## Metrics

- Total Requirements: 11 (7 FR + 4 SC)
- Total Tasks: 11 (T001–T011)
- Coverage %: 100% (tutti i requisiti hanno ≥1 task; 3 con copertura qualitativamente debole: FR-004, SC-002, SC-003)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 1

## Next Actions

- **C1 è CRITICAL** (violazione costituzionale): andrebbe risolto prima di considerare la feature "conforme", ma non blocca l'implementazione già fatta e testata — è un problema di documentazione/governance, non di codice funzionante.
- Gli altri item sono HIGH/MEDIUM/LOW e riguardano principalmente **copertura di test incompleta** (G1 in particolare) più che difetti di comportamento: il codice attuale già pubblica correttamente `close` anche negli scenari di sovrascrittura (verificato a mano nella review del codice), semplicemente non c'è un test automatico che lo dimostri.
- Comandi/azioni suggerite per la remediation, quando si riparte da questo report:
  1. Editare `plan.md` (001 e 002) per chiudere C1 (giustificazione testing in Complexity Tracking).
  2. Editare `tests/e2e/us4-pagamento-carta.spec.js` per chiudere G1 (assert su `window.__publishCalls` negli scenari di sovrascrittura) e G2 (assert di timing sulla publish).
  3. Editare `spec.md` (SC-003) per chiudere A1 (chiarire "errato" oppure restringere a "mancante").
  4. Editare `tasks.md` per chiudere I1 (correggere la nota di dipendenza T001→T002/T003).
