# OPERATING PROTOCOL

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN
- zuerst `docs/WORKFLOW.md`
- dann `docs/llm/ENTRY.md`
- dann `docs/llm/OPERATING_PROTOCOL.md`
- dann `docs/ARCHITECTURE.md`
- dann `docs/STATUS.md`
- dann `docs/llm/TASK_ENTRY_MATRIX.json`
- dann `docs/llm/entry/TASK_GATE_INDEX.md`
- dann alle passenden Task-Entries fuer alle klassifizierten Scopes
- dann die globalen Mindest-Gates:
  - `src/project/contract/manifest.js`
  - `src/kernel/store/createStore.js`
  - `src/kernel/store/applyPatches.js`

## PRUEFEN
- Task ueber `docs/llm/TASK_ENTRY_MATRIX.json` klassifizieren
- Session im Chat mit `entry` beginnen; das ist Pflicht, ersetzt aber keinen CLI-Preflight
- Bei `Entry hash drift` oder `Read-order drift` zuerst `node tools/llm-preflight.mjs update-lock`, danach `classify -> entry -> ack -> check` erneut vollstaendig.
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
- Vor jedem Commit betroffene Dokuquellen, Stringmatrix und Inventar nachziehen; am Ende jedes Arbeitsschritts Aktualitaet explizit gegen Code und Gates gegenpruefen.

## SCHREIBEN
- kein Schreiben ohne gelesenen LLM-Entry plus passendem Task-Entry
- Commits bleiben moeglichst klein, aber Multi-Scope ist zulaessig wenn kausal gekoppelt.
- task-spezifische Doku vor globaler Statuspflege
- kein Weiterarbeiten nach `check`-Rot; erst neuen Scope-Preflight aufbauen
- kein `--no-verify`, kein Hook-Bypass, kein Guard-Bypass (`SKIP`, `HUSKY=0` oder aehnlich) bei Commit/Push
- bei unklassifizierten Pfaden zuerst `docs/llm/TASK_ENTRY_MATRIX.json` erweitern und dann regulaer `classify -> entry -> ack -> check`
- UMGEHUNG (z. B. direkte State-/Patch-Injektion zur Abkuerzung von Flows) ist nur mit expliziter Ruecksprache erlaubt.
- Slice-Versionierung ist Pflicht: jeder abgeschlossene Slice erhoeht die Version um `0.0.1`; Teilschritte werden nur als Anhang `a/b/c/d` dokumentiert und zaehlen nicht als eigener Versionssprung.

## DOKU
- Maschinenlesbare Truth: `output/current-truth.json` (Manifest-Pfad + Commit-SHA)
- `docs/STATUS.md` bleibt Governance-/Entscheidungslog, nicht Truth-Quelle
- task-spezifische Doku lebt in `docs/llm/`
- Top-Level-Doku bleibt absichtlich auf vier Dateien begrenzt
- `docs/traceability/rebuild-string-matrix.md` und `docs/traceability/rebuild-preparation-inventory.md` muessen mitgezogen werden, sobald ein Task ihre Aussagen, Referenzen oder Ableitungen veraendert.
