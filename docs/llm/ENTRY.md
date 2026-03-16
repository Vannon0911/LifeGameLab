# LLM ENTRY

## Zweck
Dieser Einstieg ist der Pflicht-Dispatcher fuer jede LLM-Arbeit.
Er legt fest, wo die task-spezifischen Daten liegen, damit kein globaler Vollscan noetig ist.

## Pflicht-Lesereihenfolge (ohne Vollscan)
1. `docs/WORKFLOW.md`
2. `docs/llm/OPERATING_PROTOCOL.md`
3. `docs/llm/TASK_ENTRY_MATRIX.json` (Task klassifizieren)
4. `docs/llm/entry/TASK_GATE_INDEX.md` (minimales Gate-Set je Task)
5. Genau einen passenden Task-Entry lesen:
6. `docs/llm/ui/UI_TASK_ENTRY.md` oder `docs/llm/sim/SIM_TASK_ENTRY.md` oder `docs/llm/contracts/CONTRACT_TASK_ENTRY.md` oder `docs/llm/testing/TESTING_TASK_ENTRY.md` oder `docs/llm/versioning/VERSIONING_TASK_ENTRY.md`

## Kernel- Und Manifest-Pflichtgate (SoT)
- `src/project/contract/manifest.js` ist Source of Truth fuer Felder, Actions und Contract-Kette.
- `src/core/kernel/store.js` und `src/core/kernel/patches.js` sind Pflichtgate fuer State-Mutationen.
- Jede Task-Ausfuehrung muss diese drei Dateien mindestens referenzieren, auch wenn der Haupttask UI/Testing ist.

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
- `docs/STATUS.md`: aktive Gates, Bugfixes, Release- und Change-Stand
- `docs/STATUS.md` enthaelt auch die fixe atomare Test-TODO; keine separate TODO-Datei verwenden.

## Definition Of Done
- Contract und Gates intakt
- Determinismus intakt
- Pfadhygiene intakt
- Doku und Code synchron
- passende Tests gruen
