# BUGFIX LOG — v2.7.0

## Format
- Datum
- Problem
- Ursache
- Fix
- Verifikation

## Aktiver Eintrag
- 2026-03-15
- Problem: Verifikation angefragt, ob die zuletzt eingefuehrte Chunk-Logik fuer grosse Pflanzen-Scans im Worldgen die Laufzeitlogik bricht.
- Ursache: Unsicherheit nach der Umstellung auf deterministische Scan-Batches in `placePlants()`.
- Fix: Keine Codeaenderung an der Sim-Logik; stattdessen gezielte Re-Validierung der Determinismus- und Quick-Suites fuer den Worldgen-/Runtime-Pfad durchgefuehrt.
- Verifikation: `node tests/test-world-presets-determinism.mjs`, `node tests/test-determinism-per-tick.mjs`, `npm run test:quick` gruen.
- 2026-03-14
- Problem: Der neue Infra-Staging-Pfad konnte den Run nach einem leeren Confirm dauerhaft im Build-Modus festhalten.
- Ursache: `CONFIRM_INFRA_PATH` behandelte einen leeren Kandidatenpfad als No-Op, waehrend `TOGGLE_RUNNING(true)` bei aktivem `infraBuildMode` weiter gesperrt blieb.
- Fix: Leerer `CONFIRM_INFRA_PATH` gilt jetzt als expliziter Exit aus dem Pfadmodus, setzt `infraBuildMode=""`, startet den Run wieder und laesst `world.link`, `world.E`, DNA- und Energiewerte unveraendert; Negativtests fuer Abort- und invaliden Non-Empty-Pfad nachgezogen.
- Verifikation: `node tests/test-confirm-infra-path.mjs`, `node tests/test-version-traceability.mjs`, `npm run test:quick` gruen.
- 2026-03-14
- Problem: Main Run war in mehreren UI-/Read-Model-/Default-Pfaden inkonsistent und zu sandbox-lastig.
- Ursache: Advisor, HUD, Win-Mode-Steuerung, Overlays und Defaults waren nicht auf einen gemeinsamen Laufzeitvertrag gezogen.
- Fix: Deterministisches Advisor-Modell als Source of Truth, Main-Run-Defaults geschaerft, Win-Mode-Lock nach Tick 0, echte Diagnose-Overlays und fokussierte Vertrags-Tests.
- Verifikation: `npm run test:quick` gruen, inklusive `test-advisor-model`, `test-overlay-diagnostics`, `test-string-contract`, `test-version-traceability`.
