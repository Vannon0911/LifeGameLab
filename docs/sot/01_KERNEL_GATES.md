# 01 Kernel & Gates

## Pipeline SoT
1. validateActionAgainstSchema
2. runWithDeterminismGuard(reducer)
3. assertPatchesAllowed(mutationMatrix)
4. assertDomainPatchesAllowed(domainPatchGate + simGate)
5. applyPatches (safe paths)
6. sanitizeBySchema
7. SIM_STEP: simStepPatch mit gleicher Gate-Kette

## Harte Gates
- src/kernel/validation/validateAction.js
- src/kernel/determinism/runtimeGuards.js
- src/kernel/store/applyPatches.js
- src/game/plugin/gates.js
- src/game/contracts/simGate.js
- src/kernel/validation/validateState.js

## Funktionale Matrix
| File | Line | Symbol | Kind |
|---|---:|---|---|
| src/game/plugin/gates.js | 1 | isPlainObject | function |
| src/game/plugin/gates.js | 5 | getCtorName | function |
| src/game/plugin/gates.js | 9 | patchValueError | function |
| src/game/plugin/gates.js | 13 | getNextDims | function |
| src/game/plugin/gates.js | 24 | expectedLen | function |
| src/game/plugin/gates.js | 30 | assertDomainPatchesAllowed | function |
| src/game/plugin/gates.js | 105 | assertSimPatchesAllowed | function |
| src/kernel/determinism/rng.js | 9 | hashMix32 | function |
| src/kernel/determinism/rng.js | 19 | rng01 | function |
| src/kernel/determinism/rng.js | 23 | hashString | function |
| src/kernel/determinism/rng.js | 34 | xorshift32 | function |
| src/kernel/determinism/rng.js | 36 | next | function |
| src/kernel/determinism/rng.js | 44 | createRngStreams | function |
| src/kernel/determinism/rng.js | 49 | createRngStreamsScoped | function |
| src/kernel/determinism/rng.js | 55 | createRngStreamsFromBase | function |
| src/kernel/determinism/rng.js | 56 | mk | const-arrow |
| src/kernel/determinism/runtimeGuards.js | 1 | runWithDeterminismGuard | function |
| src/kernel/determinism/runtimeGuards.js | 10 | blocked | const-arrow |
| src/kernel/determinism/runtimeGuards.js | 13 | _dateMsg | const-arrow |
| src/kernel/determinism/runtimeGuards.js | 15 | apply | method |
| src/kernel/determinism/runtimeGuards.js | 16 | construct | method |
| src/kernel/determinism/runtimeGuards.js | 17 | get | method |
| src/kernel/determinism/runtimeGuards.js | 30 | get | method |
| src/kernel/determinism/runtimeGuards.js | 40 | patchCryptoMethod | const-arrow |
| src/kernel/determinism/runtimeGuards.js | 86 | deepFreeze | function |
| src/kernel/store/applyPatches.js | 1 | applyPatches | function |
| src/kernel/store/applyPatches.js | 9 | assertPatchesAllowed | function |
| src/kernel/store/applyPatches.js | 34 | _applyOne | function |
| src/kernel/store/applyPatches.js | 81 | cloneContainer | function |
| src/kernel/store/applyPatches.js | 90 | unescapeJsonPointer | function |
| src/kernel/store/applyPatches.js | 94 | normalizeAllowedPrefixes | function |
| src/kernel/store/applyPatches.js | 104 | assertSafePath | function |
| src/kernel/store/applyPatches.js | 113 | isUnsafeSegment | function |
| src/kernel/store/createStore.js | 10 | createStore | function |
| src/kernel/store/createStore.js | 24 | makeInitialDoc | function |
| src/kernel/store/createStore.js | 29 | migrateIfNeeded | function |
| src/kernel/store/createStore.js | 44 | docSignature | function |
| src/kernel/store/createStore.js | 48 | getState | function |
| src/kernel/store/createStore.js | 49 | getDoc | function |
| src/kernel/store/createStore.js | 50 | getSignature | function |
| src/kernel/store/createStore.js | 51 | getSignatureMaterial | function |
| src/kernel/store/createStore.js | 55 | subscribe | function |
| src/kernel/store/createStore.js | 56 | emit | function |
| src/kernel/store/createStore.js | 58 | dispatch | function |
| src/kernel/store/createStore.js | 111 | assertManifestContracts | function |
| src/kernel/store/createStore.js | 115 | cloneDeep | function |
| src/kernel/store/persistence.js | 9 | createNullDriver | const-arrow |
| src/kernel/store/persistence.js | 20 | createWebDriver | const-arrow |
| src/kernel/store/persistence.js | 56 | createMetaOnlyWebDriver | const-arrow |
| src/kernel/store/persistence.js | 85 | getDefaultDriver | const-arrow |
| src/kernel/store/replay.js | 1 | replayActions | function |
| src/kernel/store/signature.js | 1 | hash32 | function |
| src/kernel/store/signature.js | 11 | stableStringify | function |
| src/kernel/store/signature.js | 16 | _stringify | function |
| src/kernel/validation/assertDomainPatchesAllowed.js | 1 | assertDomainPatchesAllowed | function |
| src/kernel/validation/validateAction.js | 3 | validateActionAgainstSchema | function |
| src/kernel/validation/validateState.js | 1 | sanitizeBySchema | function |
| src/kernel/validation/validateState.js | 5 | assertValidBySchema | function |
| src/kernel/validation/validateState.js | 25 | resolveTypedLength | function |
| src/kernel/validation/validateState.js | 36 | coerceTypedArray | function |
| src/kernel/validation/validateState.js | 59 | _sanitize | function |
| src/kernel/validation/validateState.js | 115 | _assertValid | function |
| tools/git-llm-guard.mjs | 10 | runGit | function |
| tools/git-llm-guard.mjs | 20 | toCsv | function |
| tools/git-llm-guard.mjs | 24 | listChangedPathsForPreCommit | function |
| tools/git-llm-guard.mjs | 30 | listChangedPathsForPrePush | function |
| tools/git-llm-guard.mjs | 57 | listPathsForCommit | function |
| tools/git-llm-guard.mjs | 63 | runCheck | function |
| tools/git-llm-guard.mjs | 90 | runPreflight | function |
| tools/git-llm-guard.mjs | 117 | runCheckForCommitSeries | function |
| tools/llm-preflight.mjs | 16 | fail | function |
| tools/llm-preflight.mjs | 21 | readJson | function |
| tools/llm-preflight.mjs | 29 | sha256File | function |
| tools/llm-preflight.mjs | 34 | sha256Text | function |
| tools/llm-preflight.mjs | 38 | readOrderCount | function |
| tools/llm-preflight.mjs | 45 | normalizeRelPath | function |
| tools/llm-preflight.mjs | 56 | parsePaths | function |
| tools/llm-preflight.mjs | 69 | parseModeFlag | function |
| tools/llm-preflight.mjs | 79 | parseScopeFlag | function |
| tools/llm-preflight.mjs | 87 | matchesPrefix | function |
| tools/llm-preflight.mjs | 98 | expandScopeDependencies | function |
| tools/llm-preflight.mjs | 119 | classifyScopeByPaths | function |
| tools/llm-preflight.mjs | 135 | normalizeScopeList | function |
| tools/llm-preflight.mjs | 153 | resolveTaskContext | function |
| tools/llm-preflight.mjs | 172 | validateEntryLock | function |
| tools/llm-preflight.mjs | 192 | validateEntryLockAudit | function |
| tools/llm-preflight.mjs | 218 | ensureTaskEntries | function |
| tools/llm-preflight.mjs | 234 | ensureProofDir | function |
| tools/llm-preflight.mjs | 238 | relativize | function |
| tools/llm-preflight.mjs | 242 | taskEntryHashes | function |
| tools/llm-preflight.mjs | 248 | buildProofMaterial | function |
| tools/llm-preflight.mjs | 269 | writeProofChallenge | function |
| tools/llm-preflight.mjs | 296 | sameSet | function |
| tools/llm-preflight.mjs | 306 | sameEntryHashes | function |
| tools/llm-preflight.mjs | 318 | readSessionOrFail | function |
| tools/llm-preflight.mjs | 369 | readChallengeOrFail | function |
| tools/llm-preflight.mjs | 394 | readAckOrInit | function |
| tools/llm-preflight.mjs | 413 | upsertAckScope | function |
| tools/llm-preflight.mjs | 429 | doEntry | function |
| tools/llm-preflight.mjs | 452 | doAck | function |
| tools/llm-preflight.mjs | 469 | doCheck | function |
| tools/llm-preflight.mjs | 530 | doAudit | function |