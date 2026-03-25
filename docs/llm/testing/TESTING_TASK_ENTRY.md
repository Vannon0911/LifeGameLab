# Testing Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU
Globale Hard-Rules: `docs/llm/SAFE_RULES.md`.

## LESEN (pflicht)
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/TASK_ENTRY_MATRIX.json`
4. `docs/llm/entry/TASK_GATE_INDEX.md` (TESTING + globale Mindest-Gates)
5. diese Datei
6. `src/game/contracts/manifest.js`
7. `src/kernel/store/createStore.js`
8. `src/kernel/store/applyPatches.js`
9. `tools/llm-preflight.mjs`
10. `devtools/run-test-suite.mjs`
11. `devtools/run-all-tests.mjs`
12. `tests/test-llm-contract.mjs`
13. `tests/support/liveTestKit.mjs`

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur TESTING-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN
- Vor Schreiben (pflicht):
- `node tools/llm-preflight.mjs classify --paths tests,tools/llm-preflight.mjs,devtools/run-test-suite.mjs,devtools/run-all-tests.mjs,devtools/test-suites.mjs,devtools/evidence-runner.mjs`
- `node tools/llm-preflight.mjs entry --paths tests,tools/llm-preflight.mjs,devtools/run-test-suite.mjs,devtools/run-all-tests.mjs,devtools/test-suites.mjs,devtools/evidence-runner.mjs --mode work`
- `node tools/llm-preflight.mjs ack --paths tests,tools/llm-preflight.mjs,devtools/run-test-suite.mjs,devtools/run-all-tests.mjs,devtools/test-suites.mjs,devtools/evidence-runner.mjs`
- `node tools/llm-preflight.mjs check --paths tests,tools/llm-preflight.mjs,devtools/run-test-suite.mjs,devtools/run-all-tests.mjs,devtools/test-suites.mjs,devtools/evidence-runner.mjs`
- Vor reinem Testlauf (optional, warn-only):
- `node tools/llm-preflight.mjs audit --paths tests,tools/llm-preflight.mjs,devtools/run-test-suite.mjs,devtools/run-all-tests.mjs,devtools/test-suites.mjs,devtools/evidence-runner.mjs`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Schreiben ohne vollstaendige Pflicht-Lesereihenfolge.
- Testlaeufe bleiben immer erlaubt; Preflight-Verstoesse warnen dort nur.
- Taskwechsel/Pfadwechsel erzwingt Auto-Reclassify; Scope kann erweitert werden.
- Bei Multi-Scope alle passenden Task-Entries lesen und einen gemeinsamen Preflight fahren.
- Umgehung (direkte State-/Patch-Injektion als Abkuerzung) ist untersagt, ausser nach expliziter Ruecksprache.
- Wenn eine Annahme nicht hart belegt ist: aktive User-Rueckfrage vor `GO`; ohne Antwort kein Schreiben/Commit.
- Vor jedem Commit muessen Test-Doku, Registry-Belege und betroffene Stringmatrix-/Inventar-Dateien aktuell sein.

## DOKU (pflicht)
- Zuerst testing-spezifische Doku.
- `docs/STATUS.md` nur globale Fallback-Ansicht.
- Die atomare Test-TODO steht fix in `docs/STATUS.md` unter `Atomare Test-TODO (fix, MVP unveraendert)`.
- Keine separate TODO-Datei anlegen; bestehende fixe Datei pflegen.
- Am Ende jedes Arbeitsschritts ist zu pruefen, dass Tests, Evidence-Registry, Gates und Doku denselben Stand abbilden.

## Taskregel
Offizielle Truth laeuft dispatch-basiert ueber `devtools/evidence-runner.mjs`; globale Browser-Hooks oder Live-Client-Sonderpfade sind keine erlaubte Testsurface mehr.
- Pro abgeschlossenem Slice ist die Version um `0.0.1` zu erhoehen; Teilstufen `a/b/c/d` werden nur als Dokumentanhang gefuehrt.
