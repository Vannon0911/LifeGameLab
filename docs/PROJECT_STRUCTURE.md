# PROJECT STRUCTURE

## Canonical Layout

- `src/app/` bootstrapping and browser entry
- `src/core/kernel/` deterministic kernel utilities
- `src/core/runtime/` runtime orchestration helpers
- `src/game/sim/` simulation and reducer logic
- `src/game/render/` renderer implementation
- `src/game/ui/` UI implementation
- `src/project/` stable project-facing entrypoints
- `tests/` executable verification suite
- `tools/` utilities, profiling, redteam and UI debug helpers
- `docs/` governance, audit, change log and handoff docs

## Path Policy

- Browser entry: `src/app/main.js`
- Kernel imports: `src/core/kernel/*`
- Runtime imports: `src/core/runtime/*`
- Simulation imports: `src/game/sim/*`
- Renderer imports: `src/game/render/*`
- UI imports: `src/game/ui/*`
- Project-facing integration stays in `src/project/*`

## Removed Legacy Paths

Frühere Wrapper-Verzeichnisse und der alte Root-Browser-Entry sind nicht mehr gueltig.
Aktiver Code, Tests, Tools und operative Dokumentation duerfen nur die kanonische Struktur referenzieren.

## Documentation Layout

- `docs/START_HERE.md` Einstieg
- `docs/LLM_ENTRY.md` Contract-Gate
- `docs/PROJECT_STRUCTURE.md` Baum und Pfadregeln
- `docs/PROJECT_CONTRACT_SNAPSHOT.md` aktueller Architekturstatus
- `docs/TASK_SEQUENCE.md` offener Backlog
