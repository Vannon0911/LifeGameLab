# 06 Tests Evidence Governance

## Verification Policy
- Nur `verified`-Tests sind gueltig.
- Jeder `unverified`-Eintrag blockiert den Evidence-Run hart (quick, truth, regression, full).
- Status-SoT liegt ausschliesslich in `tests/evidence/spec-map.mjs`.
- Keine Umbenennung von Testdateien; Labeling erfolgt textuell ueber Status-Ausgabe im Runner.
- `verified` ohne `counterProbe`-Metadaten wird als Konfigurationsfehler blockiert.
- Laufzeit-Budgets sind harte Gates: `budgetMs` Ueberschreitung blockiert den Run.
- `evidence_match` erzeugt verpflichtend eine kryptografische Attestation (`attestation.json`), die sofort verifiziert wird.

## Verifikationsprotokoll (Gegenprobe-Pflicht)
- Jeder Test/Claim braucht eine Gegenprobe (negative oder perturbation probe).
- Gegenprobe muss mindestens eines zeigen:
  - Stabilitaet bei identischem Input/Replay
  - Divergenz bei kontrollierter Aenderung (Seed/Action-Variante)
  - explizite Blockade verbotener Bypass/Injection/Force-Pfade
- Erst danach darf `unverified -> verified` in `spec-map` gesetzt werden.

## Aktueller Verifikationsstand
- Claims: `claim.w1.no_bypass_surface`, `claim.w1.genesis_mainline_deterministic` -> `verified`
- Regression: alle Eintraege in `REGRESSION_TEST_STATUS` -> `verified`

## Test/Guard SoT
- tests/* determinism + replay + contract checks
- devtools/evidence-runner.mjs
- devtools/evidence-attestation.mjs
- tools/llm-preflight.mjs
- tools/git-llm-guard.mjs
- devtools/run-verification-session.mjs (`npm run test:session` = quick -> truth -> full + full-manifest-check)
- devtools/export-truth-anchors.mjs + devtools/verify-cross-platform-truth.mjs (Cross-Platform-Anchor-Compare)

## Cross-Platform Repro-Gate
- Utilities: `devtools/export-truth-anchors.mjs` + `devtools/verify-cross-platform-truth.mjs`
- Ziel-Matrix: `ubuntu-latest`, `windows-latest`, `macos-latest`
- Jede Plattform erzeugt `truth-anchors.json` aus der aktuellen Truth-Manifest-Kette.
- Vergleichsjob muss bei Anchor-Drift zwischen OS blockieren.
- Nach erfolgreichem Compare soll Linux Full-Session (`npm run test:session`) inkl. Attestation-Check laufen.

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
| devtools/demo-live-attest.mjs | 16 | waitForPortOpen | function |
| devtools/demo-live-attest.mjs | 19 | probe | const-arrow |
| devtools/demo-live-attest.mjs | 38 | stateCore | function |
| devtools/demo-live-attest.mjs | 59 | failWithState | function |
| devtools/demo-live-attest.mjs | 64 | waitForHarvest | function |
| devtools/demo-live-attest.mjs | 85 | pauseAndStep | function |
| devtools/demo-live-attest.mjs | 100 | getWorkerPoint | function |
| devtools/demo-live-attest.mjs | 111 | isValidWorker | const-arrow |
| devtools/demo-live-attest.mjs | 183 | assertState | const-arrow |
| devtools/demo-live-attest.mjs | 240 | growResource | const-arrow |
| devtools/demo-live-attest.mjs | 261 | stepFrame | const-arrow |
| devtools/demo-live-attest.mjs | 277 | inBounds | const-arrow |
| devtools/demo-live-attest.mjs | 278 | pickResourceTile | const-arrow |
| devtools/demo-live-attest.mjs | 296 | chooseHarvestTargets | const-arrow |
| devtools/demo-live-attest.mjs | 331 | toScreen | method |
| devtools/evidence-runner.mjs | 29 | assert | function |
| devtools/evidence-runner.mjs | 33 | parseArgs | function |
| devtools/evidence-runner.mjs | 56 | sha256Buffer | function |
| devtools/evidence-runner.mjs | 60 | sha256Text | function |
| devtools/evidence-runner.mjs | 64 | nowIso | function |
| devtools/evidence-runner.mjs | 68 | ensureDir | function |
| devtools/evidence-runner.mjs | 72 | sanitizeSegment | function |
| devtools/evidence-runner.mjs | 79 | toSerializable | function |
| devtools/evidence-runner.mjs | 88 | getByPath | function |
| devtools/evidence-runner.mjs | 98 | deepEqual | function |
| devtools/evidence-runner.mjs | 102 | listRepoTests | function |
| devtools/evidence-runner.mjs | 117 | assertLegacyInventory | function |
| devtools/evidence-runner.mjs | 129 | assertScenarioRegistry | function |
| devtools/evidence-runner.mjs | 138 | resolveHeadSha | function |
| devtools/evidence-runner.mjs | 149 | writeCurrentTruth | function |
| devtools/evidence-runner.mjs | 162 | constructor | method |
| devtools/evidence-runner.mjs | 162 | EvidenceJournal | class |
| devtools/evidence-runner.mjs | 167 | append | method |
| devtools/evidence-runner.mjs | 188 | createLogger | function |
| devtools/evidence-runner.mjs | 195 | out | method |
| devtools/evidence-runner.mjs | 200 | err | method |
| devtools/evidence-runner.mjs | 205 | appendStdout | method |
| devtools/evidence-runner.mjs | 208 | appendStderr | method |
| devtools/evidence-runner.mjs | 215 | writeArtifact | function |
| devtools/evidence-runner.mjs | 237 | createRunContext | function |
| devtools/evidence-runner.mjs | 255 | createDispatchHarness | function |
| devtools/evidence-runner.mjs | 264 | snapshotDispatchState | function |
| devtools/evidence-runner.mjs | 318 | getPlayerStartWindowSquareTiles | function |
| devtools/evidence-runner.mjs | 328 | executeDispatchStep | function |
| devtools/evidence-runner.mjs | 396 | verifyRequiredArtifacts | function |
| devtools/evidence-runner.mjs | 403 | typedArrayCountEquals | function |
| devtools/evidence-runner.mjs | 412 | assertDispatchScenario | function |
| devtools/evidence-runner.mjs | 460 | runDispatchScenario | function |
| devtools/evidence-runner.mjs | 518 | runRegressionFile | function |
| devtools/evidence-runner.mjs | 573 | selectRunPlan | function |
| devtools/evidence-runner.mjs | 598 | runPlan | function |
| devtools/evidence-runner.mjs | 623 | summarizeResults | function |
| devtools/evidence-runner.mjs | 634 | collectCounterexamplesBlocked | function |
| devtools/evidence-runner.mjs | 642 | main | function |
| devtools/run-all-tests.mjs | 11 | runPreflightAudit | function |
| devtools/run-foundation-visual-playwright.mjs | 27 | saveRunLog | function |
| devtools/run-foundation-visual-playwright.mjs | 31 | logStep | function |
| devtools/run-foundation-visual-playwright.mjs | 43 | waitForPortOpen | function |
| devtools/run-foundation-visual-playwright.mjs | 46 | probe | const-arrow |
| devtools/run-foundation-visual-playwright.mjs | 68 | startLocalServer | function |
| devtools/run-foundation-visual-playwright.mjs | 76 | screenshotPath | function |
| devtools/run-foundation-visual-playwright.mjs | 80 | enforceRunRetention | function |
| devtools/run-foundation-visual-playwright.mjs | 106 | getBodyText | function |
| devtools/run-foundation-visual-playwright.mjs | 110 | main | function |
| devtools/run-test-suite.mjs | 18 | runPreflightAudit | function |
| devtools/test-suites.mjs | 11 | freezeList | function |
| devtools/test-suites.mjs | 74 | resolveSuiteName | function |
| devtools/test-suites.mjs | 79 | isKnownSuite | function |
