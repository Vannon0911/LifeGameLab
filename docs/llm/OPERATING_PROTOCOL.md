# OPERATING PROTOCOL

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN
- zuerst `docs/WORKFLOW.md`
- dann `docs/llm/ENTRY.md`
- dann genau einen Task-Entry

## PRUEFEN
- Task ueber `docs/llm/TASK_ENTRY_MATRIX.json` klassifizieren
- Session im Chat mit `entry` beginnen; das ist Pflicht, ersetzt aber keinen CLI-Preflight
- technische Kette exakt einhalten:
  1. `node tools/llm-preflight.mjs classify --paths <...>`
  2. `node tools/llm-preflight.mjs entry --paths <...> --mode work|security`
  3. `node tools/llm-preflight.mjs ack --paths <...>`
  4. `node tools/llm-preflight.mjs check --paths <...>`
- Klassifikation ist dependency-basiert und liefert `taskScope[]`; Mehrfach-Scope ist erlaubt.
- Bei Pfadabweichung wird Scope automatisch neu klassifiziert (Auto-Reclassify).
- Vor Schreiben ein gruener `check`; fuer Tests reicht `audit` als Warnsignal.
- vor Commit Scope immer isolieren (`git restore --staged .`, dann nur Zielpfade stagen)
- Preflight darf Multi-Scope umfassen, wenn die Pfadmenge real mehrere Bereiche betrifft.
- Hook-Guards einmal aktivieren: `npm run hooks:install`

## SCHREIBEN
- kein Schreiben ohne gelesenen LLM-Entry plus passendem Task-Entry
- Commits bleiben moeglichst klein, aber Multi-Scope ist zulaessig wenn kausal gekoppelt.
- task-spezifische Doku vor globaler Statuspflege
- kein Weiterarbeiten nach `check`-Rot; erst neuen Scope-Preflight aufbauen
- UMGEHUNG (z. B. direkte State-/Patch-Injektion zur Abkuerzung von Flows) ist nur mit expliziter Ruecksprache erlaubt.

## DOKU
- Maschinenlesbare Truth: `output/current-truth.json` (Manifest-Pfad + Commit-SHA)
- `docs/STATUS.md` bleibt Governance-/Entscheidungslog, nicht Truth-Quelle
- task-spezifische Doku lebt in `docs/llm/`
- Top-Level-Doku bleibt absichtlich auf vier Dateien begrenzt
