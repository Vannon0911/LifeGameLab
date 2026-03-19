# WORKFLOW

## Zweck
Dies ist der einzige menschliche Einstieg in die Projektdoku.
Top-Level-Doku bleibt absichtlich klein:

1. `docs/WORKFLOW.md`
2. `docs/PRODUCT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/STATUS.md`

LLM-spezifische Regeln leben getrennt unter `docs/llm/`.

## Pflichtfolge Fuer LLM-Arbeit

### LESEN
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/OPERATING_PROTOCOL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/STATUS.md`
6. Task ueber `docs/llm/TASK_ENTRY_MATRIX.json` klassifizieren
7. `docs/llm/entry/TASK_GATE_INDEX.md` fuer minimales Gate-Set lesen
8. Alle passenden Task-Entries fuer alle klassifizierten Scopes lesen
9. Globale Mindest-Gates lesen:
   - `src/project/contract/manifest.js`
   - `src/kernel/store/createStore.js`
   - `src/kernel/store/applyPatches.js`

### PRUEFEN
- Session-Start im Chat mit `entry` ist Pflicht, aber nur als menschlicher Handshake. Der Chat-Trigger ersetzt keinen technischen Preflight.
- Danach technisch exakt in dieser Reihenfolge erzwingen:
  1. `node tools/llm-preflight.mjs classify --paths <paths>`
  2. `node tools/llm-preflight.mjs entry --paths <paths> --mode work|security`
  3. `node tools/llm-preflight.mjs ack --paths <paths>`
  4. `node tools/llm-preflight.mjs check --paths <paths>`
- `classify` arbeitet multi-scope-faehig und dependency-basiert; Ergebnis ist `taskScope[]`, nicht mehr ein einzelner Scope.
- Bei Pfadwechsel gilt Auto-Reclassify als Pflichtverhalten; Scope-Erweiterung ist erlaubt und wird nicht als Ambiguitaet blockiert.
- Git-Guards aktivieren (einmal pro Clone): `npm run hooks:install`

### SCHREIBEN
- Kein Schreiben ohne gelesenen LLM-Entry plus Task-Entry.
- Preflight (`entry/ack/check`) blockiert nur Schreiboperationen.
- Reine Lese-/Analyse-/Testlaeufe bleiben immer erlaubt; dafuer `node tools/llm-preflight.mjs audit --paths <paths>` als Warnsignal nutzen.
- Vor jedem Commit muessen betroffene Dokuquellen auf aktuellen Stand nachgezogen werden. Das gilt auch fuer Stringmatrix-/Inventar-Quellen wie `docs/traceability/rebuild-string-matrix.md` und `docs/traceability/rebuild-preparation-inventory.md`, sobald der Task deren Aussagen beruehrt.

### DOKU
- Nur diese vier Top-Level-Dateien sind kanonische Produkt-/Projekt-Doku.
- LLM-spezifische Protokolle bleiben unter `docs/llm/`.
- Historische Altdateien wurden absichtlich entfernt statt weiter mitgeschleppt.
- Am Ende jedes Arbeitsschritts ist explizit zu pruefen, dass Code, Gates, Top-Level-Doku, Task-Doku und betroffene Traceability-/Inventar-Dateien aktuell und synchron sind.

## Harte Regeln
- Maschinenlesbare Truth ist `output/current-truth.json` (letzter gueltiger Testlauf + Commit-SHA).
- `docs/STATUS.md` ist Kommentar-/Entscheidungslog, nicht Truth-Quelle.
- `docs/ARCHITECTURE.md` ist die einzige technische Snapshot-Doku.
- `docs/PRODUCT.md` ist die einzige Produkt- und Scope-Basis.
- `src/project/contract/manifest.js` bleibt Source of Truth.
- `src/kernel/store/createStore.js` und `src/kernel/store/applyPatches.js` bleiben Pflichtgates fuer jede Task-Ausfuehrung.
- Rueckverfolgbare Belege bleiben als kleine Textnachweise unter `docs/traceability/`; Massenausgaben und Bilder gehoeren nicht in den kanonischen Repo-Kern.
- Ab jetzt gilt Slice-Versionierung strikt: jeder abgeschlossene Slice erhoeht die Version um `0.0.1`. Teilschritte werden nur als Anhang `a`, `b`, `c`, `d` dokumentiert und ersetzen keinen Version-Bump.

## Abbruchregel
Wenn ein Task weder in `docs/STATUS.md` noch in `docs/PRODUCT.md` oder `docs/ARCHITECTURE.md` sauber einordenbar ist:
- nicht schreiben
- Scope-Luecke benennen
- Doku zuerst klaeren
