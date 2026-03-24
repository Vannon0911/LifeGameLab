# SoT Index

Head: `691817e`

## Module
- [01 Kernel & Gates](./01_KERNEL_GATES.md)
- [02 Contracts](./02_CONTRACTS.md)
- [03 Simulation](./03_SIMULATION.md)
- [04 Runtime Render UI](./04_RUNTIME_RENDER_UI.md)
- [05 LLM](./05_LLM.md)
- [06 Tests Evidence Governance](./06_TESTS_EVIDENCE_GOVERNANCE.md)
- [90 Action Write Matrix](./90_ACTION_WRITE_MATRIX.md)
- [99 Function Matrix](./99_FUNCTION_MATRIX.md)

## Risikohinweis
- Modularisierung ist dokumentarisch (kein Laufzeitpfad geaendert).
- Kritische SoT-Gates bleiben: validateAction -> determinism guard -> mutation matrix -> domain gate -> safe patch -> sanitize.

## Validierung
- Datum: 2026-03-19
- `npm run test:session`: PASS
- Session-Sequenz: `test:quick` -> `test:truth` -> `test:full` -> full-manifest-check
- Evidence Manifest (full): `output/evidence/2026-03-18T23-06-40-278Z-full-68d4e1e1/manifest.json`
