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
- `node tools/llm-preflight.mjs entry --paths tests/,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs --mode work`
- `node tools/llm-preflight.mjs ack --paths tests/,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs`
- `node tools/llm-preflight.mjs check --paths tests/,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs`

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

## Taskregel
Kein Testlauf ohne Ack. Main-Run-UI-Checks bleiben zusaetzlich manuell belegpflichtig.
