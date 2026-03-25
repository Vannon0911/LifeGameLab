# LLM Safe Rules (Split)

## Zweck
Kompakte, verbindliche Sicherheitsregeln fuer LLM-Arbeit.
Diese Datei reduziert Regel-Drift zwischen `WORKFLOW`, `ENTRY`, `OPERATING_PROTOCOL` und Task-Entries.

## R0 STOP/BLOCKER (Hard)
- Vor jedem operativen Start zuerst STOP/BLOCKER klaeren.
- Bei unklarem Scope, fehlender SoT-Referenz oder widerspruechlicher Anforderung: fail-closed (nur read-only).

## R1 Lesereihenfolge (Hard)
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/TASK_ENTRY_MATRIX.json`
4. `docs/llm/entry/TASK_GATE_INDEX.md`
5. Passende Task-Entries fuer alle klassifizierten Scopes
6. Globale Mindest-Gates:
   - `src/game/contracts/manifest.js`
   - `src/kernel/store/createStore.js`
   - `src/kernel/store/applyPatches.js`
Hinweis: `docs/llm/entry/TASK_GATE_INDEX.md` ist der Minimal-Index in der Reihenfolge und ersetzt nicht die kanonische Vollbeschreibung in `docs/llm/ENTRY.md`/`docs/llm/OPERATING_PROTOCOL.md`.
- **Durch Red-Team belegte Risiken**: Die laufenden Open Points (Preflight-Bypass, Dry-Run-Skip, pathless Runs, fail-open Scan-Resolution, Rebuttal-Opt-out, fehlende Regressionen) sind in `docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:115`‑`150` dokumentiert und bilden den Belegkanon für diese Regeln.

## R2 Preflight-Kette (Hard)
- Pflichtreihenfolge: `classify -> entry -> ack -> check`.
- Kein Schreiben ohne gruenes `check`.
- Bei `Entry hash drift` oder `Read-order drift`: `node tools/llm-preflight.mjs update-lock`, danach komplette Kette neu.

## R3 Annahmen-Validierung (Hard)
- Annahmen sind nie automatisch Fakten.
- Erst Evidenz pruefen (Code/Tests/Doku), dann Gegenpruefung.
- Wenn danach weiterhin unklar: aktive Rueckfrage an den User ist Pflicht.
- Pflichtformat pro offener Annahme:
  - `Annahme: <kurz und testbar>`
  - `Evidenzluecke: <Datei/Quelle oder "keine harte Evidenz">`
  - `Rueckfrage: <konkrete Ja/Nein- oder Entweder/Oder-Frage>`
- Ohne beantwortete Rueckfrage: kein `GO`, kein Schreiben, kein Commit.

## R4 Schreibregeln (Hard)
- Nur innerhalb klassifiziertem Scope schreiben.
- Kein Hook-/Guard-Bypass (`--no-verify`, `SKIP`, `HUSKY=0`).
- Keine stillen Schema-Aenderungen, keine stillen Direktwrites, keine Umgehungspfade.

## R5 Commit-Regeln (Hard)
- Vor Commit: betroffene Doku, Traceability und Inventar synchronisieren.
- Pro abgeschlossenem Slice: Version `+0.0.1` (Teilstufen `a/b/c/d` nur Doku-Anhang).

## R6 Fail-Closed Standard
- Unsicherheit, fehlende Evidenz, offene Rueckfrage, Gate-Fehler oder Drift => read-only weiter, nicht schreiben.
