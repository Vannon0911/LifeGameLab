# RUNBOOK

## Zweck
Klare Ausfuehrungslinie fuer Tasks im Repo mit strikter Trennung von Produkt-Bugs und Governance-Konflikten.

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
`src/game/contracts/manifest.js`, `src/kernel/store/createStore.js`, `src/kernel/store/applyPatches.js`

## Pflichtkette vor Schreiben
0. Bei `Entry hash drift` oder `Read-order drift`:
`node tools/llm-preflight.mjs update-lock`
1. `node tools/llm-preflight.mjs classify --paths <...>`
2. `node tools/llm-preflight.mjs spawn-proof --paths <...> --mode work|security`
3. `node tools/llm-preflight.mjs entry --paths <...> --mode work|security`
4. `node tools/llm-preflight.mjs ack --paths <...>`
5. `node tools/llm-preflight.mjs check --paths <...>`
6. `node tools/llm-preflight.mjs cache-sync --paths <...>`

## Betriebsmodus (ab sofort)
- `bug/*`: nur Produktverhalten fixen (Runtime/Sim/UI), keine Governance-Refactors.
- `governance/*`: nur SoT/Doku/Matrix/Entry-Konflikte fixen, kein Gameplay-Umbau.
- Keine Misch-PRs zwischen `bug/*` und `governance/*`.
- Alle offenen Konflikte laufen zentral ueber `docs/sot/CONFLICTS.md`.

## Minimal Blocking Gates (Push)
Nur diese drei Checks sind push-blockierend:
1. `npm run test:truth`
2. `npm run test:determinism:matrix`
3. `npm run test:smoke:e2e`

Alles andere ist warnend und darf den Fluss nicht blockieren.

## Harte Verbote
- Kein `--no-verify`.
- Kein Hook-/Guard-Bypass (`SKIP`, `HUSKY=0`, aehnliche Umgehung).
- Bei unklassifizierten Pfaden zuerst Scope-Mapping in `docs/llm/TASK_ENTRY_MATRIX.json` korrigieren, dann die Pflichtkette erneut vollstaendig ausfuehren.

## Rollenbetrieb
Rollen, Verantwortungen und Worker-Verzeichnisstruktur sind in
`agents/llm-entry-sequence/README.md` definiert.

## Wahrheit und Prioritaet
- Prozess-SoT: `docs/llm/ENTRY.md` und `docs/llm/OPERATING_PROTOCOL.md`
- Scope-SoT: `docs/llm/TASK_ENTRY_MATRIX.json`
- Gate-SoT: `docs/llm/entry/TASK_GATE_INDEX.md`
- Runtime/Contract-SoT: `src/game/contracts/manifest.js`

Bei Konflikt gilt diese Prioritaet:
`manifest.js` > `ENTRY/OPERATING_PROTOCOL` > `TASK_GATE_INDEX` > Worker-README.

