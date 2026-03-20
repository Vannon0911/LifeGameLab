# Repository Structure and Module Map

## Ziel
Diese Seite mappt die echten Modulgrenzen im aktuellen Head.

## Top-Level Rollen
- `src/kernel/`: deterministischer Store, Patching, Validierung, Persistenz, RNG.
- `src/project/contract/`: Manifest, Action/State-Schema, Mutation-Matrix, Lifecycle, Dataflow.
- `src/game/contracts/`: produktnahe Enums und IDs.
- `src/game/sim/`: aktive Runtime- und Simulationslogik inkl. MapSpec/Worldgen.
- `src/game/render/`: Renderer-Pfade.
- `src/game/ui/`: UI-Adapter und Input-Dispatch.
- `src/app/`: Boot, Runtime-Loop, Crash-Flows.

## Laufender Datenfluss
1. UI dispatcht Actions.
2. Kernel validiert und gate't gegen Contracts.
3. Reducer erzeugt erlaubte Patches.
4. Store commitet den neuen State.
5. Renderer liest State read-only.

## Slice-Realitaet
- Slice B MapSpec ist aktiv.
- Slice C Minimal UI ist aktiv.
- Legacy-Runtime bleibt als kontrollierter Fallback vorhanden.

Verbindliche Quellen:
- `docs/ARCHITECTURE.md`
- `docs/STATUS.md`
- `src/project/contract/manifest.js`
