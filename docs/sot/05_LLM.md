# 05 LLM

## SoT
- command envelope adapter: tools/llm/commandAdapter.mjs
- advisor model: tools/llm/advisorModel.mjs
- read model: tools/llm/readModel.mjs
- gate sync: tools/llm/gateSync.mjs
- policy mirror: tools/llm/policy.mjs

## Consent Gate
- Subagent-Muster-Fortsetzung ist nur nach expliziter User-Bestaetigung erlaubt.
- Pflichtfrage vor Fortsetzung:
  - `Soll ich mit diesem Subagent-Muster genauso weiterarbeiten wie bisher?`
- Ohne Bestaetigung gilt fail-closed fuer den Subagent-Orchestrierungsmodus.

## Funktionale Matrix
| File | Line | Symbol | Kind |
|---|---:|---|---|
| tools/llm/advisorModel.mjs | 182 | clamp01 | function |
| tools/llm/advisorModel.mjs | 186 | getPlayerMemory | function |
| tools/llm/advisorModel.mjs | 191 | getDoctrinePolicy | function |
| tools/llm/advisorModel.mjs | 195 | toClass | function |
| tools/llm/advisorModel.mjs | 202 | buildReasonCodes | function |
| tools/llm/advisorModel.mjs | 209 | buildBottleneck | function |
| tools/llm/advisorModel.mjs | 224 | getStructureId | function |
| tools/llm/advisorModel.mjs | 232 | getStructureLabel | function |
| tools/llm/advisorModel.mjs | 236 | getStageTargets | function |
| tools/llm/advisorModel.mjs | 242 | getZoneCoverage | function |
| tools/llm/advisorModel.mjs | 260 | buildCanonicalZoneSummary | function |
| tools/llm/advisorModel.mjs | 279 | buildPatternSummary | function |
| tools/llm/advisorModel.mjs | 299 | buildCellTopologySummary | function |
| tools/llm/advisorModel.mjs | 309 | getPatternClassCount | function |
| tools/llm/advisorModel.mjs | 318 | getTechBlockedReasonCodes | function |
| tools/llm/advisorModel.mjs | 345 | buildBlockedTechReasonLabels | function |
| tools/llm/advisorModel.mjs | 358 | findSplitOrigin | function |
| tools/llm/advisorModel.mjs | 386 | analyzeSplit | function |
| tools/llm/advisorModel.mjs | 412 | scoreTechCandidate | function |
| tools/llm/advisorModel.mjs | 422 | pickTechTargets | function |
| tools/llm/advisorModel.mjs | 446 | buildWinProgress | function |
| tools/llm/advisorModel.mjs | 528 | selectPrimary | function |
| tools/llm/advisorModel.mjs | 540 | selectSecondary | function |
| tools/llm/advisorModel.mjs | 552 | classRank | function |
| tools/llm/advisorModel.mjs | 559 | zoneToOverlay | function |
| tools/llm/advisorModel.mjs | 568 | getZoneRecommendation | function |
| tools/llm/advisorModel.mjs | 588 | getOverlayRecommendation | function |
| tools/llm/advisorModel.mjs | 607 | getNextLever | function |
| tools/llm/advisorModel.mjs | 618 | getNextAction | function |
| tools/llm/advisorModel.mjs | 644 | buildGoalCode | function |
| tools/llm/advisorModel.mjs | 652 | buildAdvisorModel | function |
| tools/llm/advisorModel.mjs | 924 | buildAdvisorDebugModel | function |
| tools/llm/commandAdapter.mjs | 3 | toPlainAction | function |
| tools/llm/commandAdapter.mjs | 21 | createLlmCommandAdapter | function |
| tools/llm/commandAdapter.mjs | 22 | llmCommandAdapter | function |
| tools/llm/gateSync.mjs | 3 | assertLlmGateSync | function |
| tools/llm/readModel.mjs | 13 | buildLlmReadModel | function |
| tools/llm/readModel.mjs | 26 | renderLlmReadModelAsText | function |
