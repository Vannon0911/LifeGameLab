# Chat Session Pipeline Audit

Stand: 2026-03-24  
Scope: Diese Datei sammelt den aktuellen, verifizierten Pipeline-Stand der Session in einem Ort.

## 1) Ziel der Pipeline
- Keine lokalen Blindspots mehr: Validierung muss den gesamten Repo-Zustand erfassen.
- Kein Weiterarbeiten mit unbestätigtem Wissensstand.
- Nach jedem Task: Synchronisation in den Cache.
- Vor jedem neuen Cycle: verifizierbarer Cache-Check als Gate.

## 2) Verifizierter Ist-Stand
- Whole-Repo-Dispatch-Truth-Test aktiv:
  - `tests/test-whole-repo-dispatch-truth.mjs`
- Whole-Repo-Dispatch-Truth ist als Pflicht-Gate in der LLM-Pipeline aktiv:
  - `tools/check-llm-pipeline.mjs` ruft den Test zwingend auf.
- Quick-Suite enthält den Whole-Repo-Dispatch-Truth-Test:
  - `devtools/test-suites.mjs`
- Regression-Registry enthält den Whole-Repo-Dispatch-Truth-Test:
  - `tests/evidence/spec-map.mjs`
- Legacy-Zone-Compat-Routing-Guard aktiv:
  - `tests/test-legacy-zone-compat-routing.mjs`

## 3) Pflicht-Gates pro Arbeitszyklus
1. Entry/Scope/Preflight-Gates erfolgreich.
2. Task-Delta ausführen.
3. Relevante Tests grün.
4. `npm run llm:pipeline:check` grün.
5. Cache-Synchronisation Pflicht (Task-Ergebnis in CACHE schreiben).
6. Temporärer Cycle-Validator prüft verifizierbaren Cache, bevor der nächste Cycle startet.

## 4) Standard-Kommandos
- Pipeline-Gesamtgate:
  - `npm run llm:pipeline:check`
- Whole-Repo-Dispatch-Truth einzeln:
  - `node tests/test-whole-repo-dispatch-truth.mjs`
- Quick-Suite:
  - `node devtools/run-test-suite.mjs quick`
- Vollsuite:
  - `npm test`

## 5) Session-Regeln (aus deinen letzten Anpassungen)
- Cache-Synchronisation ist nach jedem Task verpflichtend.
- Vor jedem neuen Cycle läuft ein temporärer Validator auf verifizierbaren Cache.
- Der Parent darf ohne grünen Cache-Check nicht in den nächsten Write-Cycle gehen.

## 6) Offene Lücke / nächster technischer Schritt
- Gewünschte zusätzliche Regel ist noch als harte Code-Policy nachzuziehen:
  - Vor Entry-Zugriff muss ein Dispatch-Agent-Spawn-Nachweis vorhanden sein.
- Zielort für Umsetzung:
  - `tools/llm-preflight.mjs` (Entry-Flow blocken, wenn Spawn-Proof fehlt).

## 7) Erfolgskriterium (Done)
- Jede Cycle-Fortsetzung ist nachweisbar an:
  - grünem `llm:pipeline:check`
  - erfolgreichem Cache-Update für den letzten Task
  - bestandenem temporären Cache-Validator vor dem nächsten Cycle.
