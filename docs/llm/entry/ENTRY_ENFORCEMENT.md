# Entry Enforcement

`docs/llm/ENTRY.md` und genau ein task-spezifischer Entry sind verpflichtend vor jeder operativen Arbeit.

## Pflichtmechanik

- Taskklassifikation erfolgt ueber `docs/llm/TASK_ENTRY_MATRIX.json` anhand von Pfaden.
- `node tools/llm-preflight.mjs classify --paths <comma-separated-paths>` klassifiziert den Task.
- `node tools/llm-preflight.mjs ack --paths <...>` erzeugt Ack in `.llm/entry-ack.json`.
- `node tools/llm-preflight.mjs check --paths <...>` validiert:
  - Hash von `docs/llm/ENTRY.md` gegen `docs/llm/entry/LLM_ENTRY_LOCK.json`
  - passendes `requiredEntry` aus Matrix
  - Hash des task-spezifischen Entry im Ack
  - Ack fuer exakt den aktiv klassifizierten Task
  - Pflichtstruktur aus `docs/llm/entry/TASK_GATE_INDEX.md` als Mindestzugriff ohne Vollscan
- `tools/run-all-tests.mjs` fuehrt einen globalen `check` aus und bricht bei Fehler hart ab.
- `tools/run-test-suite.mjs` fuehrt `check` auf Suite-Ebene und zusaetzlich vor jedem atomaren Testfile aus.
- Damit gilt LLM-Entry-Pflicht nicht nur je Suite, sondern je atomarem Task (Testfile).

## Gueltigkeitsregeln

- Kein Test ohne Ack.
- Kein Taskwechsel ohne neues passendes Ack.
- Wenn `docs/llm/ENTRY.md` oder task-spezifischer Entry geaendert wurde: Ack neu setzen.
- Wenn Pfade mehreren Tasks zugeordnet werden: in Subtasks splitten, je Subtask eigener Zyklus.
- Kernel- und Manifest-Pflichtgate gilt immer:
  - `src/project/contract/manifest.js` ist SoT
  - `src/core/kernel/store.js` und `src/core/kernel/patches.js` bleiben Pflichtreferenzen
