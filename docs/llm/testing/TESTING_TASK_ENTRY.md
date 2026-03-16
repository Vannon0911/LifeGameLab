# Testing Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/llm/ENTRY.md`
2. `docs/llm/OPERATING_PROTOCOL.md`
3. diese Datei
4. `docs/llm/entry/TASK_GATE_INDEX.md` (TESTING + globale Mindest-Gates)
5. `tools/llm-preflight.mjs`
6. `tools/run-test-suite.mjs`
7. `tools/run-all-tests.mjs`
8. `tests/test-llm-contract.mjs`
9. `tests/support/liveTestKit.mjs`

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur TESTING-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs entry --paths tests,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs,tools/test-suites.mjs,tools/evidence-runner.mjs --mode work`
- `node tools/llm-preflight.mjs ack --paths tests,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs,tools/test-suites.mjs,tools/evidence-runner.mjs`
- `node tools/llm-preflight.mjs check --paths tests,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs,tools/test-suites.mjs,tools/evidence-runner.mjs`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur Test-/Gate-Scope.
- Kein fachlicher SIM/UI/CONTRACT-Umbau ohne neuen Subtask mit eigener Klassifikation.
- Umgehung (direkte State-/Patch-Injektion als Abkuerzung) ist untersagt, ausser nach expliziter Ruecksprache.

## DOKU (pflicht)
- Zuerst testing-spezifische Doku.
- `docs/STATUS.md` nur globale Fallback-Ansicht.
- Die atomare Test-TODO steht fix in `docs/STATUS.md` unter `Atomare Test-TODO (fix, MVP unveraendert)`.
- Keine separate TODO-Datei anlegen; bestehende fixe Datei pflegen.

## Taskregel
Kein Testlauf ohne Ack. Offizielle Truth laeuft nur noch dispatch-basiert ueber `tools/evidence-runner.mjs`; globale Browser-Hooks oder Live-Client-Sonderpfade sind keine erlaubte Testsurface mehr.
