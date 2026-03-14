# progress

Original prompt: Implement the LifeGameLab V1 Freeze-Handover with fixed Main-Run rooms, preset-bound deterministic worldgen, contract-first new actions/fields, water/biome separation, labor isolation for legacy tools, and progression decoupled from HARVEST_CELL.

- 2026-03-14: Dokumentation auf LLM_ENTRY-basierte Struktur vollstaendig neu gesetzt.
- 2026-03-14: Historische Dokuinhalte konsolidiert und ersetzt.
- 2026-03-14: Naechster Schritt: groesste Datenquellen inventarisieren und Aufteilungs-/Verkleinerungsplan erstellen.
- 2026-03-14: UI (`ui.js`) entlang Verantwortlichkeiten weiter geschnitten (`ui.dom.js`, `ui.feedback.js`).
- 2026-03-14: `main.js` als reine Orchestrierung abgespeckt (`worldStateLog.js`, `reportUtils.js`, `bootStatus.js`).
- 2026-03-14: `step.js` weiter entmonolithisiert (`stepRuntime.js`) ohne Tick-Reihenfolgeaenderung.
- 2026-03-14: Tests in Klassen getrennt (`quick`, `truth`, `stress`) und Runner eingefuehrt.
- 2026-03-14: Laufzeitbudgets und Hotspot-Messung dokumentiert (`docs/TEST_BUDGETS.md`, `docs/PERF_HOTSPOTS.md`).
- 2026-03-14: Deterministisches Advisor-Read-Model als gemeinsame Source of Truth fuer `render_game_to_text`, HUD und Statuspanel eingefuehrt (`src/project/llm/advisorModel.js`, `src/project/llm/readModel.js`, `src/game/ui/ui.model.js`, `src/game/ui/ui.js`).
- 2026-03-14: Main-Run Defaults geschaerft: `SET_WIN_MODE` nach Tick 0 gesperrt, Placement Cost standardmaessig aktiv, Global Learning standardmaessig aus (`src/game/sim/reducer/controlActions.js`, `src/game/sim/reducer/index.js`, `src/project/contract/stateSchema.js`, `src/game/sim/reducer/techTreeOps.js`).
- 2026-03-14: Renderer-Overlays an `meta.activeOverlay` angebunden; `energy`, `toxin`, `nutrient`, `territory`, `conflict` liefern jetzt echte Diagnosebilder (`src/game/render/renderer.js`).
- 2026-03-14: Advisor-/Overlay-Vertraege und neue Main-Run Defaults mit fokussierten Tests abgesichert; `npm run test:quick` erfolgreich (`tests/test-advisor-model.mjs`, `tests/test-overlay-diagnostics.mjs`, aktualisierte Vertrags- und Interaktions-Tests).
- 2026-03-14: Playwright-Smoke gegen localhost aufgedeckt und behoben: Renderer brach im Feldsurface-Pfad mit `rv is not defined`; Fix in `src/game/render/renderer.js` validiert, UI rendert wieder, `advanceTime`/`render_game_to_text` laufen und der Energie-Overlay erzeugt im Pausenbild ein anderes Diagnosebild.
- 2026-03-14: Freeze-Rework gestartet: `worldPresetId`, `world.water`, `world.biomeId`, neue Main-Run-Actions und Progressionsfelder im Contract verankert.
- 2026-03-14: `worldgen.js` auf preset-gebundene deterministische Pipeline mit `river_delta`, `dry_basin`, `wet_meadow` umgestellt; `expandWorldPreserve()` kopiert jetzt `world.water` und `world.biomeId`.
- 2026-03-14: UI auf `lage/eingriffe/evolution/welt/labor` umgezogen; Main-Run nutzt `HARVEST_PULSE`, `PRUNE_CLUSTER`, `RECYCLE_PATCH`, `SEED_SPREAD`, Labor kapselt Render-/Overlay-/Brush-Diagnose.
- 2026-03-14: Freeze-Doku und fokussierte Tests hinzugefuegt (`docs/SESSION_HANDOFF.md`, `tests/test-freeze-contract.mjs`, `tests/test-freeze-progression.mjs`, `tests/test-world-presets-determinism.mjs`).
- 2026-03-14: Offene Punkte fuer Nacharbeit: Advisor-Texte und Rest-Legacy in `ui.js` weiter ausduennen, Playwright-Smoke fuer neue Panels wiederholen, groessere Truth-Suite nach Freeze-Refactor komplett durchlaufen lassen.
- 2026-03-14: Repo-eigener Playwright-Debug-Loop hinzugefuegt (`tools/playwright-debug-loop.mjs`, `docs/PLAYWRIGHT_DEBUG_LOOP.md`, `npm run debug:playwright`): setzt nach Start `ticks/s` hoch und loescht Browserdaten vor jedem Close.
- 2026-03-14: LLM_ENTRY-konformer Debug-Fix: `GEN_WORLD` setzt jetzt bootstrap-taugliche Sim-Metriken im operativen Reducerpfad; manueller Browser-Loop startet ohne falschen Kollaps-Nullzustand. Pflichtchecks gruen: drift-negative-order, determinism-long, test:quick, test:truth.
- 2026-03-14: Labor-/Benchmark-Loop nachgezogen: `ui.js` hoert jetzt live auf `benchmark:update`, `docs/PLAYWRIGHT_DEBUG_LOOP.md` auf manuellen Benchmark-Debug erweitert. Live verifiziert: Status `setup_main -> worker_init -> done`, Report sichtbar, JSON/CSV aktiv.
- 2026-03-14: Manueller 10x-UI-Debug-Loop gefahren. Reproduzierbarer Stale-Panel-Lag nach Welt-/Labor-Neustartpfaden behoben: Weltgroesse, Preset, Seed, Speed, Render- und Overlay-Wechsel triggern jetzt lokalen Panel-Repaint in `ui.js`; Vertragstest erweitert.
- 2026-03-14: LLM_ENTRY-konformer Debug-Fix: GEN_WORLD setzt jetzt bootstrap-taugliche Sim-Metriken im operativen Reducerpfad; manueller Browser-Loop startet ohne falschen Kollaps-Nullzustand. Pflichtchecks gruen: drift-negative-order, determinism-long, test:quick, test:truth.
