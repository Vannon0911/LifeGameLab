# Entry Enforcement

`docs/llm/ENTRY.md` und genau ein task-spezifischer Entry sind verpflichtend vor jeder operativen Arbeit.

## Pflichtmechanik

- Taskklassifikation erfolgt ueber `docs/llm/TASK_ENTRY_MATRIX.json` anhand von Pfaden.
- `node tools/llm-preflight.mjs classify --paths <comma-separated-paths>` klassifiziert den Task.
- `node tools/llm-preflight.mjs entry --paths <...> --mode work|security` startet die Session technisch.
- `node tools/llm-preflight.mjs ack --paths <...>` erzeugt Ack in `.llm/entry-ack.json`.
- `node tools/llm-preflight.mjs check --paths <...>` validiert:
  - aktive Session in `.llm/entry-session.json` (max. 12h alt)
  - Hash von `docs/llm/ENTRY.md` gegen `docs/llm/entry/LLM_ENTRY_LOCK.json`
  - passendes `requiredEntry` aus Matrix
  - Session-Task + Session-Mode passen zum aktuellen Check
  - Hash des task-spezifischen Entry im Ack
  - Ack fuer exakt den aktiv klassifizierten Task
  - Pflichtstruktur aus `docs/llm/entry/TASK_GATE_INDEX.md` als Mindestzugriff ohne Vollscan
- `devtools/run-all-tests.mjs` fuehrt einen globalen `check` aus und bricht bei Fehler hart ab.
- `devtools/run-test-suite.mjs` fuehrt `check` auf Suite-Ebene und zusaetzlich vor jedem atomaren Testfile aus.
- Damit gilt LLM-Entry-Pflicht nicht nur je Suite, sondern je atomarem Task (Testfile).
- Git-Hooks (`.githooks/pre-commit`, `.githooks/pre-push`) blocken Commit/Push bei fehlendem Check.

## Gueltigkeitsregeln

- Kein Test ohne Ack.
- Kein Ack ohne aktive Session (`entry`).
- Kein Taskwechsel ohne neues passendes Ack.
- Session verfällt nach 12h; danach `entry` neu setzen.
- Wenn `docs/llm/ENTRY.md` oder task-spezifischer Entry geaendert wurde: Ack neu setzen.
- Wenn Pfade mehreren Tasks zugeordnet werden: in Subtasks splitten, je Subtask eigener Zyklus.
- Wenn eine Annahme nicht hart belegt ist: vor `GO` aktive Rueckfrage an den User; ohne Antwort kein Schreiben/Commit.
- Kernel- und Manifest-Pflichtgate gilt immer:
  - `src/game/contracts/manifest.js` ist SoT
  - `src/kernel/store/createStore.js` und `src/kernel/store/applyPatches.js` bleiben Pflichtreferenzen
