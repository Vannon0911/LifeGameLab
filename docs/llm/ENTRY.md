# LLM ENTRY

## Zweck
Dieser Einstieg ist der Pflicht-Dispatcher fuer jede LLM-Arbeit.
Er legt fest, wo die task-spezifischen Daten liegen, damit kein globaler Vollscan noetig ist.

## Pflicht-Lesereihenfolge (ohne Vollscan)
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/OPERATING_PROTOCOL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/STATUS.md`
6. `docs/llm/TASK_ENTRY_MATRIX.json` (Task klassifizieren)
7. `docs/llm/entry/TASK_GATE_INDEX.md` (minimales Gate-Set je Task)
8. Passende Task-Entries fuer alle klassifizierten Scopes lesen:
   - `docs/llm/ui/UI_TASK_ENTRY.md`
   - `docs/llm/sim/SIM_TASK_ENTRY.md`
   - `docs/llm/contracts/CONTRACT_TASK_ENTRY.md`
   - `docs/llm/testing/TESTING_TASK_ENTRY.md`
   - `docs/llm/versioning/VERSIONING_TASK_ENTRY.md`
9. Globale Mindest-Gates lesen:
   - `src/project/contract/manifest.js`
   - `src/kernel/store/createStore.js`
   - `src/kernel/store/applyPatches.js`

## Preflight-Vertrag
- Jeder Task wird ueber `docs/llm/TASK_ENTRY_MATRIX.json` dependency-basiert als `taskScope[]` klassifiziert.
- Die technische Pflichtkette ist immer exakt `classify -> entry -> ack -> check`.
- Bei Pfadwechsel ist Auto-Reclassify Pflicht; Scope-Erweiterung ist erlaubt und keine Ambiguitaet.
- `entry`, `ack` und `check` blockieren Schreiboperationen; reine Read-/Analyse-/Testlaeufe bleiben erlaubt.
- Commits werden aus isoliertem Stage gebaut; Multi-Scope-Commits sind erlaubt, wenn die Pfade kausal gekoppelt sind.
- Ein `check`-Fehler blockiert Schreiben. Testlaeufe bleiben moeglich und liefern weiterhin Wahrheit.
- Der Chat-Trigger `entry` ist nur der menschliche Startimpuls. Die technische Wahrheit lebt ausschliesslich in `tools/llm-preflight.mjs`.
- Vor jedem Commit muessen betroffene Dokuquellen inklusive relevanter Stringmatrix-/Inventar-Dateien nachgezogen und am Ende des Arbeitsschritts erneut auf Aktualitaet geprueft werden.

## Kernel- Und Manifest-Pflichtgate (SoT)
- `src/project/contract/manifest.js` ist Source of Truth fuer Felder, Actions und Contract-Kette.
- `src/kernel/store/createStore.js` und `src/kernel/store/applyPatches.js` sind Pflichtgate fuer State-Mutationen.
- Diese drei Dateien gehoeren in jede Pflicht-Lesereihenfolge, auch wenn der Haupttask UI/Testing ist.

## Harte Invarianten
- State nur ueber `dispatch()` plus Patches
- Kernel bleibt einziger Keeper
- Renderer und UI bleiben read-only gegen Gameplay-State
- kein `Math.random()` oder `Date.now()` in Reducer oder SimStep
- neue Felder und Actions zuerst im Manifest und Contract
- UMGEHUNG IST STRENG VERBOTEN OHNE VORHERIGE RUECKSPRACHE. Das gilt insbesondere fuer direkte State-/Patch-Injektion in Tests oder Runtime-Flows.

## Globale Pflichtquellen
- `docs/PRODUCT.md`: Produkt- und Scope-Basis
- `docs/ARCHITECTURE.md`: technische Snapshot-Wahrheit
- `output/current-truth.json`: maschinenlesbare Truth (`manifest + commit SHA`)
- `docs/STATUS.md`: Kommentar-/Entscheidungslog fuer Gates, Bugfixes, Release- und Change-Stand
- `docs/traceability/rebuild-string-matrix.md` und `docs/traceability/rebuild-preparation-inventory.md`: nachziehen, sobald der Task ihre Aussagen oder Referenzketten veraendert

## Definition Of Done
- Contract und Gates intakt
- Determinismus intakt
- Pfadhygiene intakt
- Doku und Code synchron
- passende Tests gruen
- aktiver Task-Preflight gueltig und driftfrei fuer den benutzten Scope
- Versionsregel eingehalten: pro abgeschlossenem Slice `+0.0.1`; Teilstufen `a/b/c/d` nur als Dokumentanhang
