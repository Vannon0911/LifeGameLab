# Playwright Debug Loop and Visual Testing

## Zweck
Browsernahe Regression fuer UI/Runtime-Stabilitaet, zusaetzlich zu deterministischen Kernel-Tests.

## Relevante Tools
- `npm run test:foundation:visual`
- `tools/run-foundation-visual-playwright.mjs`

## Was verifiziert wird
- UI-Baseline und sichtbare Layout-/Header-Stabilitaet.
- Grundlegender Worldgen-Flow im Browser.
- Canvas-Praesenz nach Interaktion.

## Artefakte
- Output unter `output/playwright/...`.
- Run-Logs und Screenshots zur Nachvollziehbarkeit.

## Einordnung
Visual-Tests sind Integrationssignal, nicht Ersatz fuer Contract-/Determinismus-Tests.

Verbindliche Quellen:
- `tools/run-foundation-visual-playwright.mjs`
- `docs/STATUS.md`
- `tests/`
