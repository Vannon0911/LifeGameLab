# progress

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
