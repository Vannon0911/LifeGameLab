# W1 Proof Summary

## Purpose
This file is the minimal durable proof for the current deterministic W1 scope.
It replaces raw run dumps and screenshot archives with a small text summary.

## Source
- command: `node tools/run-all-tests.mjs --full`
- run date: `2026-03-16`
- proof scope: `w1`
- manifest: `output/evidence/2026-03-16T20-29-41-219Z-full-9ceb4c82/manifest.json`

## Outcome
- overall: `evidence_match`
- claim status: `match`
- regression status: `match`

## Anchors
- event chain root: `bfc9a4d66ab5b82c073c8c513cc7a2f3b640e28d491a50762f3e44148f36a6df`
- no bypass surface signature: `1c33a493`
- no bypass surface state hash: `2abfab6211965bcfc7d6ce18d7b769374ec33f1b7330baa122d87da4735c3932`
- no bypass surface read-model hash: `14e196b34802f619a05e52550ab48861e3dccd01dfe57975eaba5daa2c87250c`
- genesis after-core state hash: `ff0b0b801bac3b63ce0cd79e21b2f0a64f366519e322c7f52f5fae1c572f0ade`
- genesis step-1 state hash: `48727f693d97513a10c3d1410081b3f60d6d2e5828d79492ff27d2ab4042b304`
- genesis step-4 state hash: `c781c366b88b78bef0be824f96678a6edef77c785f708443174f1efaefb95426`
- genesis step-4 read-model hash: `f1542ba341932c08ea4fe24c1a8f56150522bbc3f2a7194816366f1468996a85`
- genesis step-4 signature: `0cd164a5`

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
- Entry-Governance and Entry-Contract were hardened before this run; the testing proof now enforces explicit path-drift failure and repeated `check` rotation.
- Repetition probe on `2026-03-16` stayed green with the same canonical state/read-model anchors and a new event-chain root.
- P1 drift probes are now part of the official regression truth: `test-step-chain-determinism` for runtime-test drift and `test-readmodel-determinism` for artefact/read-model drift.
