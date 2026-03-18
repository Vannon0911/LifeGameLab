# SoT Index

Head: `4921773`

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
- Datum: 2026-03-18
- `npm run test:quick`: PASS
- `npm run test:truth`: PASS
- `npm run test:full`: PASS
- Evidence Manifest (full): `output/evidence/2026-03-18T22-44-35-093Z-full-5abce712/manifest.json`
