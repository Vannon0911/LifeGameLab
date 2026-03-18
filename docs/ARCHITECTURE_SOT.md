# ARCHITECTURE_SOT

Head: `4921773`

Modular SoT Einstieg:
- [SoT Index](./sot/00_INDEX.md)
- [Kernel & Gates](./sot/01_KERNEL_GATES.md)
- [Contracts](./sot/02_CONTRACTS.md)
- [Simulation](./sot/03_SIMULATION.md)
- [Runtime Render UI](./sot/04_RUNTIME_RENDER_UI.md)
- [LLM](./sot/05_LLM.md)
- [Tests Evidence Governance](./sot/06_TESTS_EVIDENCE_GOVERNANCE.md)
- [Action Write Matrix](./sot/90_ACTION_WRITE_MATRIX.md)
- [Function Matrix](./sot/99_FUNCTION_MATRIX.md)

Kurz-SoT-Kette: validateAction -> determinism guard -> mutation matrix -> domain gate -> safe patch -> sanitize -> persist/emit.
Nicht-aktive/teilverdrahtete Features sind explizit in [03 Simulation](./sot/03_SIMULATION.md) markiert.