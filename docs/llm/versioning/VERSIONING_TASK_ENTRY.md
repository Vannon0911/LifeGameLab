# Versioning Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU
Globale Hard-Rules: `docs/llm/SAFE_RULES.md`.

## LESEN (pflicht)
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/TASK_ENTRY_MATRIX.json`
4. `docs/llm/entry/TASK_GATE_INDEX.md` (VERSIONING + globale Mindest-Gates)
5. diese Datei
6. `src/game/contracts/manifest.js`
7. `src/kernel/store/createStore.js`
8. `src/kernel/store/applyPatches.js`
9. `package.json`

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur VERSIONING-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs classify --paths package.json,src/game/contracts/manifest.js,docs/ARCHITECTURE.md,docs/STATUS.md`
- `node tools/llm-preflight.mjs entry --paths package.json,src/game/contracts/manifest.js,docs/ARCHITECTURE.md,docs/STATUS.md --mode work`
- `node tools/llm-preflight.mjs ack --paths package.json,src/game/contracts/manifest.js,docs/ARCHITECTURE.md,docs/STATUS.md`
- `node tools/llm-preflight.mjs check --paths package.json,src/game/contracts/manifest.js,docs/ARCHITECTURE.md,docs/STATUS.md`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Schreiben ohne vollstaendige Pflicht-Lesereihenfolge.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur Versioning-/Governance-Scope gemaess Matrix.
- Bei Multi-Scope alle passenden Task-Entries lesen und einen gemeinsamen Preflight fahren.
- Wenn eine Annahme nicht hart belegt ist: aktive User-Rueckfrage vor `GO`; ohne Antwort kein Schreiben/Commit.
- Vor jedem Commit muessen alle betroffenen Dokuquellen, Stringmatrix und Inventar nachgezogen sein; fehlende Dokuaktualitaet blockiert den Commit.

## DOKU (pflicht)
- Task-spezifische Versioning-Doku zuerst.
- `docs/STATUS.md` bleibt globale Gesamtansicht/Fallback und ist nicht Standard-Entry fuer operative Arbeit.
- Am Ende jedes Arbeitsschritts ist explizit zu pruefen, dass Versionsstand, Doku, Belege und Gates konsistent sind.

## Taskregel
Version wird nach Update-Groesse erhoeht und muss in App-Metadaten, Doku und Testbelegen synchron sein.
- Ab jetzt strikt: jeder abgeschlossene Slice erhoeht die Version um `0.0.1`. Teilschritte `a/b/c/d` werden nur als Dokumentanhang gefuehrt und ersetzen keinen Versionssprung.

## Klassifizierungs-Hinweis
- Top-Level-Doku und operative LLM-Doku gehoeren zum Versioning-/Governance-Scope.
- Dazu zaehlen `docs/WORKFLOW.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md` sowie globale Entry-/Protocol-/Matrix-Dokumente.
