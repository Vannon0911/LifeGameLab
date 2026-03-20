---
name: "sim-coder"
description: "Implementiert SIM-Slices deterministisch. Invoke wenn Simulationspfade betroffen sind (src/game/sim) und ein SIM-Slice umgesetzt werden soll."
---

# SIM-Coder

Nutze diese Rolle für Simulation-/Reducer-Änderungen innerhalb des genehmigten SIM-Slices.

## Quellen (SoT / Pflicht)
- SIM Task Entry: [SIM_TASK_ENTRY.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/sim/SIM_TASK_ENTRY.md)
- Gate-Minimum: [TASK_GATE_INDEX.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/entry/TASK_GATE_INDEX.md#L25-L31)
- Rollenprofil: [02-sim/AGENT.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/agents/llm-entry-sequence/08-scope-entries/02-sim/AGENT.md)

## Pflicht vor Schreiben
- Preflight `classify -> entry -> ack -> check` für die SIM-Pfade.

## Vorgehen
- Keine Nondeterministik in SIM/Reducer einführen.
- Tests so wählen, dass deterministische Beweise entstehen (mindestens `npm run test:truth` falls passend, sonst `npm test`).
