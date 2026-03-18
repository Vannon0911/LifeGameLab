# 06 Tests Evidence Governance

## Test/Guard SoT
- tests/* determinism + replay + contract checks
- tools/evidence-runner.mjs
- tools/llm-preflight.mjs
- tools/git-llm-guard.mjs

## Funktionale Matrix
| File | Line | Symbol | Kind |
|---|---:|---|---|
| tests/support/liveTestKit.mjs | 11 | sha256Text | function |
| tests/support/liveTestKit.mjs | 15 | createDeterministicStore | function |
| tests/support/liveTestKit.mjs | 27 | getPlayerStartWindowSquare | function |
| tests/support/liveTestKit.mjs | 39 | bootstrapMainRun | function |
| tests/support/liveTestKit.mjs | 51 | stepMany | function |
| tests/support/liveTestKit.mjs | 57 | snapshotStore | function |
| tests/test-deterministic-genesis.mjs | 5 | assertFoundationBlockedUntilEligible | function |
| tests/test-deterministic-genesis.mjs | 24 | runScenario | function |
| tests/test-deterministic-genesis.mjs | 81 | assertSameSeedReplay | function |
| tests/test-kernel-replay-truth.mjs | 11 | buildReplayActions | function |
| tests/test-kernel-replay-truth.mjs | 38 | runReplayTruth | function |
| tests/test-llm-contract.mjs | 42 | sha256Text | function |
| tests/test-llm-contract.mjs | 46 | runPreflight | function |
| tests/test-llm-contract.mjs | 58 | backupPath | function |
| tests/test-llm-contract.mjs | 76 | restorePath | function |
| tests/test-readmodel-determinism.mjs | 5 | runReadModelReplay | function |
| tests/test-step-chain-determinism.mjs | 5 | runStepChainReplay | function |
| tools/demo-live-attest.mjs | 16 | waitForPortOpen | function |
| tools/demo-live-attest.mjs | 19 | probe | const-arrow |
| tools/demo-live-attest.mjs | 38 | stateCore | function |
| tools/demo-live-attest.mjs | 59 | failWithState | function |
| tools/demo-live-attest.mjs | 64 | waitForHarvest | function |
| tools/demo-live-attest.mjs | 85 | pauseAndStep | function |
| tools/demo-live-attest.mjs | 100 | getWorkerPoint | function |
| tools/demo-live-attest.mjs | 111 | isValidWorker | const-arrow |
| tools/demo-live-attest.mjs | 183 | assertState | const-arrow |
| tools/demo-live-attest.mjs | 240 | growResource | const-arrow |
| tools/demo-live-attest.mjs | 261 | stepFrame | const-arrow |
| tools/demo-live-attest.mjs | 277 | inBounds | const-arrow |
| tools/demo-live-attest.mjs | 278 | pickResourceTile | const-arrow |
| tools/demo-live-attest.mjs | 296 | chooseHarvestTargets | const-arrow |
| tools/demo-live-attest.mjs | 331 | toScreen | method |
| tools/evidence-runner.mjs | 29 | assert | function |
| tools/evidence-runner.mjs | 33 | parseArgs | function |
| tools/evidence-runner.mjs | 56 | sha256Buffer | function |
| tools/evidence-runner.mjs | 60 | sha256Text | function |
| tools/evidence-runner.mjs | 64 | nowIso | function |
| tools/evidence-runner.mjs | 68 | ensureDir | function |
| tools/evidence-runner.mjs | 72 | sanitizeSegment | function |
| tools/evidence-runner.mjs | 79 | toSerializable | function |
| tools/evidence-runner.mjs | 88 | getByPath | function |
| tools/evidence-runner.mjs | 98 | deepEqual | function |
| tools/evidence-runner.mjs | 102 | listRepoTests | function |
| tools/evidence-runner.mjs | 117 | assertLegacyInventory | function |
| tools/evidence-runner.mjs | 129 | assertScenarioRegistry | function |
| tools/evidence-runner.mjs | 138 | resolveHeadSha | function |
| tools/evidence-runner.mjs | 149 | writeCurrentTruth | function |
| tools/evidence-runner.mjs | 162 | constructor | method |
| tools/evidence-runner.mjs | 162 | EvidenceJournal | class |
| tools/evidence-runner.mjs | 167 | append | method |
| tools/evidence-runner.mjs | 188 | createLogger | function |
| tools/evidence-runner.mjs | 195 | out | method |
| tools/evidence-runner.mjs | 200 | err | method |
| tools/evidence-runner.mjs | 205 | appendStdout | method |
| tools/evidence-runner.mjs | 208 | appendStderr | method |
| tools/evidence-runner.mjs | 215 | writeArtifact | function |
| tools/evidence-runner.mjs | 237 | createRunContext | function |
| tools/evidence-runner.mjs | 255 | createDispatchHarness | function |
| tools/evidence-runner.mjs | 264 | snapshotDispatchState | function |
| tools/evidence-runner.mjs | 318 | getPlayerStartWindowSquareTiles | function |
| tools/evidence-runner.mjs | 328 | executeDispatchStep | function |
| tools/evidence-runner.mjs | 396 | verifyRequiredArtifacts | function |
| tools/evidence-runner.mjs | 403 | typedArrayCountEquals | function |
| tools/evidence-runner.mjs | 412 | assertDispatchScenario | function |
| tools/evidence-runner.mjs | 460 | runDispatchScenario | function |
| tools/evidence-runner.mjs | 518 | runRegressionFile | function |
| tools/evidence-runner.mjs | 573 | selectRunPlan | function |
| tools/evidence-runner.mjs | 598 | runPlan | function |
| tools/evidence-runner.mjs | 623 | summarizeResults | function |
| tools/evidence-runner.mjs | 634 | collectCounterexamplesBlocked | function |
| tools/evidence-runner.mjs | 642 | main | function |
| tools/run-all-tests.mjs | 11 | runPreflightAudit | function |
| tools/run-foundation-visual-playwright.mjs | 27 | saveRunLog | function |
| tools/run-foundation-visual-playwright.mjs | 31 | logStep | function |
| tools/run-foundation-visual-playwright.mjs | 43 | waitForPortOpen | function |
| tools/run-foundation-visual-playwright.mjs | 46 | probe | const-arrow |
| tools/run-foundation-visual-playwright.mjs | 68 | startLocalServer | function |
| tools/run-foundation-visual-playwright.mjs | 76 | screenshotPath | function |
| tools/run-foundation-visual-playwright.mjs | 80 | enforceRunRetention | function |
| tools/run-foundation-visual-playwright.mjs | 106 | getBodyText | function |
| tools/run-foundation-visual-playwright.mjs | 110 | main | function |
| tools/run-test-suite.mjs | 18 | runPreflightAudit | function |
| tools/test-suites.mjs | 11 | freezeList | function |
| tools/test-suites.mjs | 74 | resolveSuiteName | function |
| tools/test-suites.mjs | 79 | isKnownSuite | function |