# PROJECT_STRUCTURE

## Aktiver Baum
- `src/app/`
- `src/core/kernel/`
- `src/core/runtime/`
- `src/game/sim/`
- `src/game/render/`
- `src/game/ui/`
- `src/project/`
- `tests/`
- `tools/`
- `docs/`

## Rollen
- Kernel: State/Schema/Patch/Determinismus-Gates
- Runtime: Orchestrierung ausserhalb des Kernels
- Sim: Regeln, Reducer, Step
- Render: reine Darstellung
- UI: read-only + Action-Dispatch
- Project: stabile Fassaden und Contract-Definition
- Docs/Governance: Phase-TODOs, LLM-Einstieg, Scope- und Handoff-Artefakte

## Aktuelle Zuschnitte (2026-03-14)
- `src/game/ui/ui.js`: UI-Orchestrierung (Panels, Event-Wiring, Dispatch)
- `src/game/ui/ui.dom.js`: DOM-/Format-Helfer
- `src/game/ui/ui.feedback.js`: Gate-/Action-Feedback und Live-Region-Announcements
- `src/game/render/fogOfWar.js`: Fog-State, CPU-Intel-Redaktion und Read-/Render-Helfer
- `src/app/main.js`: Bootstrap + Runtime-Orchestrierung
- `src/app/runtime/worldStateLog.js`: Weltzustands-Logging + CSV
- `src/app/runtime/reportUtils.js`: Report-Utilities
- `src/app/runtime/bootStatus.js`: Boot/Error-Statusanzeige
- `src/game/sim/step.js`: Tick-Orchestrierung
- `src/game/sim/stepRuntime.js`: Lineage-/Trait-Runtime-Helfer (pure)
- `src/game/sim/infra.js`: committed-Infra-Helfer fuer Sicht und Path-Regeln
- `src/game/sim/reducer/index.js`: Routing/Komposition
- `src/game/sim/reducer/controlActions.js`: pure Control-Action-Helfer
- `docs/PHASE_A_TODO.md`: abgeschlossene Ticketfolge fuer Phase A und B
- `docs/PHASE_C_TODO.md`: abgeschlossene Ticketfolge fuer DNA-/Zone-2 inkl. belegter Scope-Grenzen
- `docs/PHASE_D_TODO.md`: abgeschlossene Ticketfolge fuer Infrastruktur + aktive Sicht/Fog
- `docs/PHASE_E_TODO.md`: vorbereitete Folgephase fuer kanonisches Zonensystem + Pattern-Engine
- `docs/PHASE_F_TODO.md`: vorbereitete Folgephase fuer Tech-Tree, Progression und Objectives
- `docs/PHASE_G_TODO.md`: vorbereitete Folgephase fuer Balance, Cleanup und RC-Haertung
- `docs/LLM_ENTRY.md`: bindender Einstieg fuer Pflichtlesereihenfolge, Gates und Phasen-Doku
