# ARCHITECTURE

**APP_VERSION:** 0.7.3

## Architektur-Kern
- Manifest-first bleibt aktiv.
- State-Updates bleiben patch-only.
- Kernel bleibt einzige Schreibinstanz fuer Gameplay-State.
- UI und Renderer bleiben read-only gegenueber Gameplay-State.
- Keine Entropiequellen wie `Math.random()` oder `Date.now()` in Reducer/SimStep.

## Kanonische Module
- `src/kernel/*`: deterministischer Kernel, Patches, Persistenz, RNG, Domain-Gate-Hook
- `src/core/kernel/*`: Compatibility-Fassade auf `src/kernel/*`
- `src/project/contract/*`: State-, Action-, Mutation-, Gate- und Dataflow-Vertrag
- `src/game/plugin/*`: Game-Adapter (`logic.js`) und konkrete Domain-Gates (`gates.js`)
- `src/game/sim/*`: Simulationslogik, Worldgen, Step-Pipeline, Reducer
- `src/game/render/*`: kanonischer Renderer plus Worker
- `src/game/ui/*`: derzeit neutraler Adapter + Verdrahtungs-Stubs (kein aktives Legacy-Panelsystem)
- `src/app/*`: Boot, Runtime, Tick-Loop, Fehlerstatus

## Laufende Wahrheiten (Head)
- Operativer Reducerpfad: `src/game/sim/reducer/index.js`.
- `src/game/sim/reducer.js` bleibt Compatibility-Fassade.
- Runtime-Flag: `SIM_RUNTIME_DISABLED = true` (Sim-Runtime aktuell blockiert).
- Tick-Loop ist deterministisch gehaertet: kein dt-cap, kein catchup-cap, catch-up via `while (acc >= stepMs)`.
- Render-Mode wird beim Boot auf `cells` gesetzt.
- UI-Hauptklasse in `src/game/ui/ui.js` ist no-op und haelt nur API-Form fuer Wiring stabil.
- Runtime-Archiv (Begründung + Guardrails): `docs/traceability/sim-runtime-archive-2026-03-18.md`.

## Contract-Status
- Thin-Facades fuer `project.manifest.js`, `sim.js`, `reducer.js` und `src/game/sim/gate.js` aktiv.
- `project.manifest.js` verdrahtet Domain-Gate ueber Plugin-Hook (`domainPatchGate`).
- Tick-Orchestrierung liegt in `step.js`, Phasenlogik in `stepPhases.js`, Runtime-Helfer in `stepRuntime.js`.
- Keine globale Live-Surface fuer Store/Perf/Textdiagnose im Browser.

## Test- und Gate-Basis
- Einstieg: `node tools/evidence-runner.mjs --suite claims|regression|full`
- Wrapper: `node tools/run-test-suite.mjs <suite>` und `node tools/run-all-tests.mjs --full`
- Aktive Determinismus-/Replay-Regressionslinie:
  - `node tests/test-deterministic-genesis.mjs`
  - `node tests/test-step-chain-determinism.mjs`
  - `node tests/test-readmodel-determinism.mjs`
  - `node tests/test-kernel-replay-truth.mjs`

## Repo-Struktur
- `src/app/`: Bootstrap und Laufzeit-Hooks
- `src/core/`: Kernel-Kompatibilitaet
- `src/game/`: Sim, Renderer, UI
- `src/project/`: Manifest, Contracts, LLM-Glue
- `tests/`: Determinismus-, Bypass- und LLM-Gate-Beweise
- `tools/`: Test-Suites, Evidence, Debug-Helfer
- `docs/`: kanonische Top-Level-Doku plus `docs/llm/`
