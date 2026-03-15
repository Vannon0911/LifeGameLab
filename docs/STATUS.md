# STATUS — v2.6.0

## Zweck
Diese Datei ist die einzige Status-, Bugfix-, Release- und Changelog-Quelle.
Sie wird append-only gepflegt.
Sie ist zugleich die globale Fallback-Ansicht fuer Governance- und Versioning-Fragen.

## Projektstand
- Phasen A bis F sind produktiv abgeschlossen.
- Phase G ist aktiv und auf Cleanup, Balance und RC-Haertung beschraenkt.
- Neue Kernfeatures, neue Zone und neue Presets bleiben gesperrt.

## Aktive Release-Gates

### Verifiziert Gruen
- `npm run test:quick`
- `npm run test:truth`
- `npm run test:stress`
- `node tests/test-phase-e-integrity.mjs`
- `node tests/test-phase-f-progression-integrity.mjs`
- `node tests/test-release-candidate-integrity.mjs`
- `node tests/test-phase-g-cleanup.mjs`
- Letzte Gegenprobe auf aktuellem Branch: 2026-03-15 (`quick`, `truth`, `stress` gruen)

### Noch Offen
- Perf-Budgets sauber messen und einhalten
- Preset-Balance fuer `river_delta`, `dry_basin`, `wet_meadow`
- Migration-Sicherheit explizit gegenpruefen
- finale Release-Abnahme fuer Phase G dokumentieren

## Phasenstatus
- Phase A/B: Genesis, Core und Contract-Basis abgeschlossen
- Phase C: DNA-Zone und DNA-Flow abgeschlossen
- Phase D: Infrastruktur- und Sicht/Fog-Basis im Code vorhanden; Alt-TODO wurde in diese Statusdatei ueberfuehrt
- Phase E: kanonische Zonen und Pattern-State abgeschlossen
- Phase F: Tech-Gates, Progression und Result-only-Losepfade abgeschlossen
- Phase G: Cleanup, Perf, Balance und RC-Haertung aktiv

## Aktive Prioritaetenliste (Phase G)

### P0 (Blocker vor RC)
1. Perf-Budgets messen und regressionssicher machen
2. Preset-Balance fuer `river_delta`, `dry_basin`, `wet_meadow` abschliessen
3. Migration-Sicherheit explizit gegenpruefen

### P1 (RC-Haertung)
1. Legacy-Reste in Main-Run und Renderer weiter minimieren
2. Release-Checklist finalisieren

### P2 (Laufende Pflege)
1. Doku und Testbelege auf RC-Stand halten

## Release-Plan (Phase G -> RC)

### Milestone R1 (P0 schliessen)
1. Perf-Budgets:
   `tests/test-performance-budgets.mjs` anlegen/aktivieren und in `truth` oder `stress` registrieren.
2. Preset-Balance:
   `tests/test-preset-balance.mjs` + reproduzierbares Balance-Reporting fuer `river_delta`, `dry_basin`, `wet_meadow`.
3. Migration-Sicherheit:
   `tests/test-migration-safety.mjs` mit klaren Drift-Regeln (Schema, strict-Pfade, Snapshot-Stabilitaet).
4. Gate:
   `npm run test:quick`, `npm run test:truth`, `npm run test:stress` muessen nach den Aenderungen weiter gruen bleiben.

### Milestone R2 (P1 RC-Haertung)
1. Legacy-Entkopplung:
   verbleibende `LEGACY_CONTEXT`-Pfade in UI/Renderer weiter reduzieren oder explizit als bewusst verbleibend klassifizieren.
2. RC-Checklist finalisieren:
   eindeutiger Go/No-Go-Block in dieser Datei mit allen Pflichtgates und Abbruchkriterien.
3. Gate:
   `node tests/test-phase-g-cleanup.mjs` und `node tests/test-release-candidate-integrity.mjs` gruen.

### Milestone R3 (RC-Freeze)
1. Doku-Sync:
   `README.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md` ohne Drift.
2. Finale Gegenprobe:
   Full run `quick/truth/stress` plus RC-Integritaetstest dokumentiert.
3. Release-Entscheid:
   RC nur bei komplett gruener Gate-Lage; sonst NO-GO mit dokumentierter Restliste.

## Naechste Session Startpaket
- Ziel: sofort mit P0-TODO starten, ohne erneute Gate-Suche.
- LLM-Leseweg bis Gate verifiziert am 2026-03-15:
  `WORKFLOW -> docs/llm/ENTRY.md -> docs/llm/OPERATING_PROTOCOL.md -> TASK_ENTRY_MATRIX -> TASK_GATE_INDEX -> task-entry -> classify/ack/check`.
- Handshake ist aktuell (`.llm/entry-ack.json`): `versioning`, `testing`, `ui`, `sim`, `contracts` vorhanden.
- Sicherheitsnachweis aktuell: `node tests/test-llm-contract.mjs` gruen (2026-03-15).
- Startkommandos fuer die naechste Session:
  1. `node tools/llm-preflight.mjs classify --paths <task-pfade>`
  2. `node tools/llm-preflight.mjs ack --paths <task-pfade>`
  3. `node tools/llm-preflight.mjs check --paths <task-pfade>`
  4. danach erst schreiben/testen.
- Wichtiger Hinweis: `src/project/contract/manifest.js` klassifiziert matrix-bedingt mehrdeutig (`contracts` + `versioning`); fuer Vertragsarbeit deshalb disjunkte Contract-Pfade nutzen (z. B. `src/project/contract/stateSchema.js`) oder Task strikt trennen.

## Bugfix-Log

### 2026-03-15
- Problem: Verifikation angefragt, ob die zuletzt eingefuehrte Chunk-Logik fuer grosse Pflanzen-Scans im Worldgen die Laufzeitlogik bricht.
- Ursache: Unsicherheit nach der Umstellung auf deterministische Scan-Batches in `placePlants()`.
- Fix: Keine Codeaenderung an der Sim-Logik; stattdessen gezielte Re-Validierung der Determinismus- und Quick-Suites fuer den Worldgen-/Runtime-Pfad durchgefuehrt.
- Verifikation: `node tests/test-world-presets-determinism.mjs`, `node tests/test-determinism-per-tick.mjs`, `npm run test:quick` gruen.

### 2026-03-15
- Problem: `tests/test-invariants.mjs` fiel reproduzierbar mit `link on dead tile`.
- Ursache: organische CPU-Links in `src/game/sim/network.js` konnten bis exakt `1.0` wachsen und wirkten dadurch wie committed Infrastruktur.
- Fix: dynamische Links bleiben jetzt strikt unter `COMMITTED_INFRA_THRESHOLD`; echte Player-Infrastruktur darf weiter `1` sein.
- Verifikation: `tests/test-network-commit-threshold.mjs` neu, `npm run test:quick` gruen.

### 2026-03-15
- Problem: Main-Run trug weiter tote UI-/Renderer- und Labor-Ableger.
- Ursache: Legacy-Kontexte und Roh-Brush-Schutz waren nicht hart genug gekapselt.
- Fix: Cleanup in `src/game/ui/ui.js` und `src/game/render/renderer.js`, Labor-only-Guards nachgezogen, `SET_WIN_MODE` aus Main-Run-Action-Surface entfernt.
- Verifikation: `node tests/test-phase-g-cleanup.mjs` gruen, `npm run test:truth` gruen.

### 2026-03-14
- Problem: Main Run war in mehreren UI-/Read-Model-/Default-Pfaden inkonsistent und zu sandbox-lastig.
- Ursache: Advisor, HUD, Win-Mode-Steuerung, Overlays und Defaults waren nicht auf einen gemeinsamen Laufzeitvertrag gezogen.
- Fix: deterministisches Advisor-Modell als Source of Truth, Main-Run-Defaults geschaerft, Win-Mode-Lock nach Tick 0, echte Diagnose-Overlays und fokussierte Vertrags-Tests.
- Verifikation: `npm run test:quick` gruen, inklusive `test-advisor-model`, `test-overlay-diagnostics`, `test-string-contract`, `test-version-traceability`.

## Append-Only Change Log

### 2026-03-15 session `release-plan-rc-phase-g`
- Konkreten Release-Plan fuer Phase G in drei Milestones (R1 P0, R2 RC-Haertung, R3 RC-Freeze) dokumentiert.
- Gates und Exit-Kriterien pro Milestone explizit als Startanweisung fuer die naechste Session festgehalten.

### 2026-03-15 e6020d4 `fix: restore llm lock and dataflow dispatch mapping after rebase`
- `docs/llm/entry/LLM_ENTRY_LOCK.json` nach Rebase-Konflikt wieder auf gueltigen Stand gebracht.
- `src/project/contract/dataflow.js` mit fehlender UI-Dispatchquelle fuer `SET_WIN_MODE` synchronisiert.
- Quick-Gegenprobe danach wieder gruen.

### 2026-03-15 session `status-sync-after-rebase`
- `docs/STATUS.md` auf Ist-Stand nachgezogen (Prioritaeten, aktuelle Gegenprobe, Rebase-Fix).
- Verifikation auf aktuellem Stand bestaetigt: `npm run test:truth`, `npm run test:stress` gruen.

### 2026-03-15 46556d6 `major clean`
- UI- und Renderer-Cleanup fuer Phase G umgesetzt
- `tests/test-phase-g-cleanup.mjs` angelegt
- `tools/test-suites.mjs` um Cleanup-Gate erweitert
- Debug-Loop-Artefakte aktualisiert

### 2026-03-15 9a5ae91 `test now green`
- Phase-G-Status und Gegenprobe dokumentiert
- Truth-Suite nachgezogen
- Debug-Loop-Artefakte fuer gruene Gegenprobe aktualisiert

### 2026-03-15 b630ae9 `test and fixes`
- Schwellenfehler in `src/game/sim/network.js` behoben
- `tests/test-network-commit-threshold.mjs` angelegt
- `tools/playwright-debug-loop.mjs` gehaertet

### 2026-03-15 b81bc3f `patch: docs: close phase f and open phase g`
- Phase F offiziell geschlossen
- Phase G als aktiver Release-Block geoeffnet

### 2026-03-15 e7dc96b `patch: tests: merge phase f loss coverage`
- Phase-F-Losepfade in fokussierte Tests ueberfuehrt
- Truth-Suite fuer Progressions-/Lose-Integritaet ausgebaut

## Versioning-Regel
- Versionsaenderungen muessen zu `package.json`, `src/project/project.manifest.js`, `README.md`, `index.html`, `docs/ARCHITECTURE.md` und dieser Datei passen.
- Kleinere Governance- oder Cleanup-Aenderungen ohne neue Produktoberflaeche brauchen nicht automatisch einen Versionssprung.
