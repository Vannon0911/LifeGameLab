# W1 Proof Summary

## Purpose
This file is the minimal durable proof for the current deterministic W1 scope.
It replaces raw run dumps and screenshot archives with a small text summary.

## Source
- command: `node tools/run-all-tests.mjs --full`
- run date: `2026-03-16`
- proof scope: `w1`

## Outcome
- overall: `evidence_match`
- claim status: `match`
- regression status: `match`

## Anchors
- event chain root: `4354329ffda62f96dc4496d7df6a3b01bbf9af82a044f051cd0e1082ff10a4f7`
- no bypass surface state hash: `2abfab6211965bcfc7d6ce18d7b769374ec33f1b7330baa122d87da4735c3932`
- no bypass surface read-model hash: `14e196b34802f619a05e52550ab48861e3dccd01dfe57975eaba5daa2c87250c`
- genesis deterministic state hash: `c781c366b88b78bef0be824f96678a6edef77c785f708443174f1efaefb95426`
- genesis deterministic read-model hash: `f1542ba341932c08ea4fe24c1a8f56150522bbc3f2a7194816366f1468996a85`
- genesis deterministic signature: `0cd164a5`

## Active Tests
- `tests/test-contract-no-bypass.mjs`
- `tests/test-deterministic-genesis.mjs`
- `tests/test-llm-contract.mjs`

## Notes
- No browser-global debug surface is part of this proof.
- No screenshot or raw output archive is required to verify the current W1 state.
