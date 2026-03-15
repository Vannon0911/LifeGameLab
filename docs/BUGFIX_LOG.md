# BUGFIX LOG — v2.6.0

## Format
- Datum
- Problem
- Ursache
- Fix
- Verifikation

## Aktiver Eintrag
- 2026-03-14
- Problem: Main Run war in mehreren UI-/Read-Model-/Default-Pfaden inkonsistent und zu sandbox-lastig.
- Ursache: Advisor, HUD, Win-Mode-Steuerung, Overlays und Defaults waren nicht auf einen gemeinsamen Laufzeitvertrag gezogen.
- Fix: Deterministisches Advisor-Modell als Source of Truth, Main-Run-Defaults geschaerft, Win-Mode-Lock nach Tick 0, echte Diagnose-Overlays und fokussierte Vertrags-Tests.
- Verifikation: `npm run test:quick` gruen, inklusive `test-advisor-model`, `test-overlay-diagnostics`, `test-string-contract`, `test-version-traceability`.
