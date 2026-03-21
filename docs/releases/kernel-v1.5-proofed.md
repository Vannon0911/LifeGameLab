# Kernel v1.5 Determinism Proofed (App v0.9.0 / Schema v2)

Diese Release-Markierung dokumentiert den verifizierten Kernel-v1.5-Meilenstein bei unveraenderter App-Version `0.9.0`.

## Version Source of Truth
- `src/game/contracts/manifest.js`: `APP_VERSION = "0.9.0"`, `SCHEMA_VERSION = 2`
- `docs/PRODUCT.md`: Version-Boundary mit `v1.5` als World-/Runtime-Contract-Meilenstein

## Was wurde gehaertet
- Genesis-bezogene Determinismus-Claims wurden auf RTS-Mainline umgestellt (`claim.w1.rts_mainline_deterministic`).
- Truth-Anchor wurde auf den Zustand direkt nach `GEN_WORLD` (`after-worldgen`) gesetzt.
- Evidence-/Traceability-Dokumente spiegeln diese neue Baseline.

## Wie der Determinismus bewiesen wird
1. `npm run test:quick` validiert die Evidence-Claims inkl. Mainline-Determinismus.
2. `npm run test:determinism:matrix` fuehrt pro Seed zwei getrennte Node-Prozesse aus.
3. Ein Lauf gilt nur als stabil, wenn Run A und Run B fuer denselben Seed identische `signatureMaterialHash`-Werte liefern.

## Self-Test
```bash
npm run test:quick
npm run test:determinism:matrix
node devtools/determinism-seed-matrix.mjs --seeds repro-a,repro-b,repro-c --ticks 100
```
