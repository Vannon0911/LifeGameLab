# Testing Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/OPERATING_PROTOCOL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/STATUS.md`
6. `docs/llm/TASK_ENTRY_MATRIX.json`
7. `docs/llm/entry/TASK_GATE_INDEX.md` (TESTING + globale Mindest-Gates)
8. diese Datei
9. `src/project/contract/manifest.js`
10. `src/kernel/store/createStore.js`
11. `src/kernel/store/applyPatches.js`
12. `tools/llm-preflight.mjs`
13. `tools/run-test-suite.mjs`
14. `tools/run-all-tests.mjs`
15. `tests/test-llm-contract.mjs`
16. `tests/support/liveTestKit.mjs`

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur TESTING-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN
- Vor Schreiben (pflicht):
- `node tools/llm-preflight.mjs classify --paths tests,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs,tools/test-suites.mjs,tools/evidence-runner.mjs`
- `node tools/llm-preflight.mjs entry --paths tests,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs,tools/test-suites.mjs,tools/evidence-runner.mjs --mode work`
- `node tools/llm-preflight.mjs ack --paths tests,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs,tools/test-suites.mjs,tools/evidence-runner.mjs`
- `node tools/llm-preflight.mjs check --paths tests,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs,tools/test-suites.mjs,tools/evidence-runner.mjs`
- Vor reinem Testlauf (optional, warn-only):
- `node tools/llm-preflight.mjs audit --paths tests,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs,tools/test-suites.mjs,tools/evidence-runner.mjs`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Schreiben ohne vollstaendige Pflicht-Lesereihenfolge.
- Testlaeufe bleiben immer erlaubt; Preflight-Verstoesse warnen dort nur.
- Taskwechsel/Pfadwechsel erzwingt Auto-Reclassify; Scope kann erweitert werden.
- Bei Multi-Scope alle passenden Task-Entries lesen und einen gemeinsamen Preflight fahren.
- Umgehung (direkte State-/Patch-Injektion als Abkuerzung) ist untersagt, ausser nach expliziter Ruecksprache.
- Vor jedem Commit muessen Test-Doku, Registry-Belege und betroffene Stringmatrix-/Inventar-Dateien aktuell sein.

## DOKU (pflicht)
- Zuerst testing-spezifische Doku.
- `docs/STATUS.md` nur globale Fallback-Ansicht.
- Die atomare Test-TODO steht fix in `docs/STATUS.md` unter `Atomare Test-TODO (fix, MVP unveraendert)`.
- Keine separate TODO-Datei anlegen; bestehende fixe Datei pflegen.
- Am Ende jedes Arbeitsschritts ist zu pruefen, dass Tests, Evidence-Registry, Gates und Doku denselben Stand abbilden.

## Taskregel
Offizielle Truth laeuft dispatch-basiert ueber `tools/evidence-runner.mjs`; globale Browser-Hooks oder Live-Client-Sonderpfade sind keine erlaubte Testsurface mehr.
- Pro abgeschlossenem Slice ist die Version um `0.0.1` zu erhoehen; Teilstufen `a/b/c/d` werden nur als Dokumentanhang gefuehrt.
