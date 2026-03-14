# Versioning Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/LLM_ENTRY.md`
2. `docs/LLM_OPERATING_PROTOCOL.md`
3. diese Datei
4. `package.json`
5. `src/project/contract/manifest.js`
6. `docs/VERSIONING_BY_UPDATE_SIZE.md`
7. `docs/MASTER_CHANGE_LOG.md`

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs check --paths package.json,src/project/contract/manifest.js,docs/VERSIONING_BY_UPDATE_SIZE.md,docs/MASTER_CHANGE_LOG.md`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/LLM_ENTRY.md` + passenden Task-Entry.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur Versioning-/Governance-Scope gemaess Matrix.
- Kein fachlicher SIM/UI/CONTRACT-Umbau ohne neuen Subtask mit eigener Klassifikation.

## DOKU (pflicht)
- Task-spezifische Versioning-Doku zuerst.
- `docs/MASTER_CHANGE_LOG.md` bleibt globale Gesamtansicht/Fallback und ist nicht Standard-Entry fuer operative Arbeit.

## Taskregel
Version wird nach Update-Groesse erhoeht und muss in App-Metadaten, Doku und Testbelegen synchron sein.

## Klassifizierungs-Hinweis
- Phasenplanung und operative LLM-Doku gehoeren zum Versioning-/Governance-Scope.
- Dazu zaehlen `docs/PHASE_*_TODO.md`, `docs/*HANDOFF*.md`, `docs/*ENTRY*.md` sowie globale Entry-/Protocol-/Matrix-Dokumente.
