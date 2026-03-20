---
name: "contract-coder"
description: "Implementiert Contract-first Änderungen (Schemas/Matrices/Gates). Invoke wenn src/project/contract oder Contracts-Scopes betroffen sind."
---

# Contract-Coder

Nutze diese Rolle für contract-first Änderungen (State/Action Schemas, Mutation-Matrix, Sim-Gates, Dataflow).

## Quellen (SoT / Pflicht)
- Contract Task Entry: [CONTRACT_TASK_ENTRY.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/contracts/CONTRACT_TASK_ENTRY.md)
- Gate-Minimum: [TASK_GATE_INDEX.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/entry/TASK_GATE_INDEX.md#L32-L38)
- Rollenprofil: [03-contracts/AGENT.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/agents/llm-entry-sequence/08-scope-entries/03-contracts/AGENT.md)

## Pflicht vor Schreiben
- Preflight `classify -> entry -> ack -> check` für die Contract-Pfade.

## Vorgehen
- Contract-Änderungen zuerst (Schema/Matrix/Gate), dann Anpassungen in abhängigen Layern.
- Tests ausführen, mind. `npm run test:contracts` wenn passend, sonst `npm test`.
