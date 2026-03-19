# RUNBOOK

## Zweck
Zentrale Ausfuehrungsanweisung fuer Tasks im Repo, ohne Duplikation der Detailregeln.

## Verbindliche Reihenfolge
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/OPERATING_PROTOCOL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/STATUS.md`
6. `docs/llm/TASK_ENTRY_MATRIX.json`
7. `docs/llm/entry/TASK_GATE_INDEX.md`
8. passende Scope-Entries (`ui`, `sim`, `contracts`, `testing`, `versioning`)
9. globale Mindest-Gates:
`src/project/contract/manifest.js`, `src/kernel/store/createStore.js`, `src/kernel/store/applyPatches.js`

## Pflichtkette vor Schreiben
1. `node tools/llm-preflight.mjs classify --paths <...>`
2. `node tools/llm-preflight.mjs entry --paths <...> --mode work|security`
3. `node tools/llm-preflight.mjs ack --paths <...>`
4. `node tools/llm-preflight.mjs check --paths <...>`

## Harte Verbote
- Kein `--no-verify`.
- Kein Hook-/Guard-Bypass (`SKIP`, `HUSKY=0`, aehnliche Umgehung).
- Bei unklassifizierten Pfaden zuerst Scope-Mapping in `docs/llm/TASK_ENTRY_MATRIX.json` korrigieren, dann die Pflichtkette erneut vollstaendig ausfuehren.

## Rollenbetrieb
Rollen, Verantwortungen und Worker-Verzeichnisstruktur sind in
`workers/llm-entry-sequence/README.md` definiert.

## Wahrheit und Prioritaet
- Prozess-SoT: `docs/llm/ENTRY.md` und `docs/llm/OPERATING_PROTOCOL.md`
- Scope-SoT: `docs/llm/TASK_ENTRY_MATRIX.json`
- Gate-SoT: `docs/llm/entry/TASK_GATE_INDEX.md`
- Runtime/Contract-SoT: `src/project/contract/manifest.js`

Bei Konflikt gilt diese Prioritaet:
`manifest.js` > `ENTRY/OPERATING_PROTOCOL` > `TASK_GATE_INDEX` > Worker-README.
