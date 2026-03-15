# Testing Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/llm/ENTRY.md`
2. `docs/llm/OPERATING_PROTOCOL.md`
3. diese Datei
4. `tools/llm-preflight.mjs`
5. `tools/run-test-suite.mjs`
6. `tools/run-all-tests.mjs`
7. `tests/test-llm-contract.mjs`
8. `tests/support/liveTestKit.mjs`

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs check --paths tests/,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur Test-/Gate-Scope.
- Kein fachlicher SIM/UI/CONTRACT-Umbau ohne neuen Subtask mit eigener Klassifikation.

## DOKU (pflicht)
- Zuerst testing-spezifische Doku.
- `docs/STATUS.md` nur globale Fallback-Ansicht.

## Taskregel
Kein Testlauf ohne Ack. Main-Run-UI-Checks bleiben zusaetzlich manuell belegpflichtig.
