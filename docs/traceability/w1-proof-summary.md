# W1 Proof Summary

## Purpose
This file is the minimal durable proof for the current deterministic W1 scope.
It replaces raw run dumps and screenshot archives with a small text summary.

## Source
- command: `node devtools/run-all-tests.mjs --full`
- run date: `2026-03-16`
- proof scope: `w1`
- manifest: `output/evidence/2026-03-16T20-29-41-219Z-full-9ceb4c82/manifest.json`

## Outcome
- overall: `evidence_match`
- claim status: `match`
- regression status: `match`

## Anchors
- EVENT_CHAIN_ROOT=`<pending_local_probe>`
- NO_BYPASS_SURFACE_SIGNATURE=`<pending_local_probe>`
- NO_BYPASS_SURFACE_STATE_HASH=`<pending_local_probe>`
- NO_BYPASS_SURFACE_READMODEL_HASH=`<pending_local_probe>`
- RTS_WORLDGEN_STATE_HASH=`<pending_local_probe>`
- RTS_TICK1_STATE_HASH=`<pending_local_probe>`
- RTS_TICK4_STATE_HASH=`<pending_local_probe>`
- RTS_TICK4_READMODEL_HASH=`<pending_local_probe>`
- RTS_TICK4_SIGNATURE=`<pending_local_probe>`

## Active Tests
- `tests/test-contract-no-bypass.mjs`
- `tests/test-dispatch-error-state-stability.mjs`
- `tests/test-deterministic-genesis.mjs`
- `tests/test-readmodel-determinism.mjs`
- `tests/test-step-chain-determinism.mjs`
- `tests/test-llm-contract.mjs`

## Notes
- No browser-global debug surface is part of this proof.
- No screenshot or raw output archive is required to verify the current W1 state.
- Hash variables above are intentionally empty until a local probe run writes real values.
- Entry-Governance and Entry-Contract were hardened before this run; the testing proof now enforces explicit path-drift failure and repeated `check` rotation.
- Repetition probe on `2026-03-16` stayed green with the same canonical state/read-model anchors and a new event-chain root.
- P1 drift probes are now part of the official regression truth: `test-step-chain-determinism` for runtime-test drift and `test-readmodel-determinism` for artefact/read-model drift.
