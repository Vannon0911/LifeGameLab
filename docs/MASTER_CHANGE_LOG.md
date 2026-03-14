# MASTER CHANGE LOG — LifexLab (Reconstructed History)

Dieser Log rekonstruiert die Evolution der Codebasis bis zum aktuellen v2.3.0 Release.

## Changelog-Policy

- Dieser Log ist **append-only**.
- Bestehende Einträge werden nicht gelöscht, nicht verkürzt und nicht durch Kurzfassungen ersetzt.
- Korrekturen oder Klarstellungen erfolgen nur als zusätzliche, datierte Nachträge.
- Repo-Hygiene, Doku-Umbauten und Strukturänderungen werden hier nachvollziehbar ergänzt, auch wenn sich `APP_VERSION` nicht ändert.

## Rev 10.0 (v1.0.0) — 2026-03-08: Baseline "Hard-Mode"
- **Kern:** Erste Implementierung des deterministischen Kernels (V4).
- **Status:** Basis-Gitter-Simulation ohne Fraktionen. Alle Zellen gehören einem einzigen globalen Pool an.
- **Ressourcen:** Energie (E) und Licht (L) implementiert.

## Rev 10.1 (v1.1.0) — 2026-03-12: P0–P3 Transition
- **Änderung:** Einführung der Phasen P0 bis P3 zur Behebung von Startblockern.
- **Fix:** UI-Initialisierung entkoppelt (`queueMicrotask`).
- **Feature:** Erste Trennung von `playerLineageId` und `cpuLineageId`.
- **Ressource:** `playerDNA` als Metrik im State eingeführt.

## Rev 11.0 (v1.2.0) — 2026-03-13: Zonen-System Alpha
- **Feature:** Implementierung der `zoneMap`.
- **Zonen:** NEXUS (Energie), BUFFER (Upkeep), QUARANTINE (Reproduktion), HARVEST (DNA).
- **HUD:** CPU-Energie-Dashboard hinzugefügt.

## Rev 12.0 (v2.0.0) — 2026-03-13: Schema-Evolution (Contract Update)
- **Brechend:** `SCHEMA_VERSION` auf 2 angehoben.
- **Kernel:** Strengere Validierung gegen `mutationMatrix` für alle SIM_STEP Operationen.
- **Branding:** UI zeigt nun APP_VERSION 2.0.0.

## Rev 13.0 (v2.0.1) — 2026-03-13: DEFENSE-Update
- **Feature:** DEFENSE-Zone vollständig funktionsfähig (Schadensreduktion 50%).
- **Gameplay:** `lineageDefenseReadiness` als persistente Metrik in `step.js`.
- **UX:** Inaktive Siegbedingungen werden im HUD als Hex-Icons (⬡) angezeigt.

## Rev 13.1 (v2.2.1) — 2026-03-13: Security Patch
- **Fix:** `Date.now()` und Determinismus-Guard via Proxy gehärtet.
- **Test:** Einführung von `test-faction-metrics.mjs` und `test-gameplay-loop.mjs`.

## Rev 14.0 (v2.3.0) — 2026-03-13: Release "Sandbox Integrity"
- **Security:** `performance.now()` und `performance.getEntries()` im `runWithDeterminismGuard` blockiert.
- **Fix:** `PLACE_CELL` Ownership-Leak behoben (Spieleraktionen können CPU-Zellen nicht mehr löschen).
- **Tooling:** Testlauf als `tools/run-all-tests.mjs` vereinheitlicht; `npm test` läuft plattformfest ohne Bash-Abhängigkeit.
- **Auditability:** `WorldStateLog.toCsv()` nutzt feste Spaltenliste; leerer Export und Datenexport können nicht mehr auseinanderdriften.
- **Traceability:** Neuer Test `test-version-traceability.mjs` beweist Konsistenz von `APP_VERSION`, `package.json`, `index.html`, README und Doku.
- **Cleanup:** Wrapper-Pfade vollständig entfernt.
- **Dokumentation:** Aktive Doku auf flache `docs/`-Struktur reduziert.
- **Audit:** 21 Testdateien erfolgreich verifiziert, Vollsuite inkl. Redteam grün.

## Nachtrag — 2026-03-14: Changelog-Invariante und Doku-Nachvollziehbarkeit
- **Policy-Fix:** Changelog als append-only festgeschrieben. Künftige Änderungen dürfen nur ergänzen, nicht ersetzen.
- **Dokumentation:** Arbeitsdoku und Einstiegspfade auf diese Policy synchronisiert.
- **Traceability:** Konsistenztest erweitert, damit der Changelog nicht stillschweigend zu einer Kurzfassung zurückgebaut wird.

## Nachtrag — 2026-03-14: Doku-/TODO-Sync nach Gameplay- und LLM-Checks
- **Statuskorrektur:** Snapshot und Handoff auf den realen Prüfstand synchronisiert; die Vollsuite ist aktuell nicht vollständig grün.
- **Erster Blocker:** `tests/test-faction-metrics.mjs` schlägt derzeit für mindestens einen Seed fehl, weil die Player-Fraktion bis Tick 80 ausstirbt.
- **LLM-Test-Entry:** Als offene Integrationspunkte dokumentiert, dass `window.render_game_to_text` und `window.advanceTime` noch fehlen.
- **UI/UX-Stand:** Browser-Checks für Mobile/Desktop, Tool-Feedback und Benchmark-UI waren grün; der offene Stand ist damit primär Sim-/Teststabilität, nicht Shell oder Rendering.

## Nachtrag — 2026-03-14: Re-Verification, Split-Gate-Härtung und Baum-Cleanup
- **Re-Verification:** `npm test` ist wieder vollständig grün; Determinismus (`long`, `per-tick`, `with-interactions`), Core-Gates und SIM-Gates sind erneut verifiziert.
- **LLM-Entry:** `window.render_game_to_text` und `window.advanceTime` sind vorhanden; der Browser-/Strategie-Contract ist damit testseitig geschlossen.
- **Security:** `PLACE_SPLIT_CLUSTER` ist jetzt atomar und quarantänebewusst; teilweises Platzieren in belegte oder blockierte 4x4-Felder ist unterbunden und per `tests/test-split-security-gate.mjs` abgesichert.
- **Cleanup:** leere Legacy-Pfade und der verschachtelte Altcontainer wurden entfernt; `tests/test-path-hygiene.mjs` erzwingt jetzt deren echte Abwesenheit.
- **Modularisierung:** spielernahe Reducer-Handler wurden nach `src/game/sim/playerActions.js` ausgelagert; gemeinsame Hilfen `cloneTypedArray` und `paintCircle` leben in `src/game/sim/shared.js`.

---
*Ende der aktuell rekonstruierten und append-only geführten Historie.*
