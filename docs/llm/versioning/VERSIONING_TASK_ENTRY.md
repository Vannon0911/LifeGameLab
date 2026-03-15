# Versioning Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/llm/ENTRY.md`
2. `docs/llm/OPERATING_PROTOCOL.md`
3. diese Datei
4. `docs/llm/entry/TASK_GATE_INDEX.md` (VERSIONING + globale Mindest-Gates)
5. `package.json`
6. `src/project/contract/manifest.js`
7. `docs/ARCHITECTURE.md`
8. `docs/STATUS.md`

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur VERSIONING-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs check --paths package.json,src/project/contract/manifest.js,docs/ARCHITECTURE.md,docs/STATUS.md`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur Versioning-/Governance-Scope gemaess Matrix.
- Kein fachlicher SIM/UI/CONTRACT-Umbau ohne neuen Subtask mit eigener Klassifikation.

## DOKU (pflicht)
- Task-spezifische Versioning-Doku zuerst.
- `docs/STATUS.md` bleibt globale Gesamtansicht/Fallback und ist nicht Standard-Entry fuer operative Arbeit.

## Taskregel
Version wird nach Update-Groesse erhoeht und muss in App-Metadaten, Doku und Testbelegen synchron sein.

## Klassifizierungs-Hinweis
- Top-Level-Doku und operative LLM-Doku gehoeren zum Versioning-/Governance-Scope.
- Dazu zaehlen `docs/WORKFLOW.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md` sowie globale Entry-/Protocol-/Matrix-Dokumente.
