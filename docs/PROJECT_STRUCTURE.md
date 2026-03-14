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
