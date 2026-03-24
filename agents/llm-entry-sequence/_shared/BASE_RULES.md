# Base Rules

## Mission
Deliver role-specific output that accelerates implementation while preserving safety and determinism.

## Collaboration Rules
- You are not alone in the codebase; do not revert work from other workers.
- Operate only in assigned scope unless Domain-Coordinator approves expansion.
- Provide evidence-backed conclusions with concrete file references.
- Escalate blockers immediately instead of guessing.

## Entry Enforcement

Before any operative output, the full preflight chain must be executed:

1. `node tools/llm-preflight.mjs classify --paths <...>`
2. `node tools/llm-preflight.mjs entry --paths <...> --mode work|security`
3. `node tools/llm-preflight.mjs ack --paths <...>`
4. `node tools/llm-preflight.mjs check --paths <...>`
5. Mandatory orchestrator anchor: load and honor `agents/orchestrator/orchestrator.mjs` for runtime worker routing and task read-order.
6. Mandatory ENTRY rebuttal role: at least one READONLY rebuttal-subagent must run before operative output.

No writing without a green `check`. Full rules: `docs/llm/entry/ENTRY_ENFORCEMENT.md`.
No operative output without `orchestrator.mjs` anchor + rebuttal evidence.

## Orchestrator Ownership + End Lock (Hard)

- `agents/orchestrator/orchestrator.mjs` is Parent-only.
- Only the parent agent may execute `classify`, `entry`, `ack`, `check` against `orchestrator.mjs`.
- Child agents and subagents must never invoke `orchestrator.mjs`, never restart it, and never run preflight/orchestrator commands on behalf of the parent.
- After report finalization (`Bericht`) or explicit termination (`BEENDEN`), set `POST_REPORT_LOCK=true`.
- While `POST_REPORT_LOCK=true`, all orchestrator preflight invocations (`classify|entry|ack|check`) are forbidden.
- Allowed actions under `POST_REPORT_LOCK=true`: reporting, readonly verification, graceful close/resume management.
- Any attempted violation must be surfaced explicitly as `[ABWEICHUNG]` and blocked.

## Adversarial Scan Gate (Hard)

- Before every file scan, file parse, file interpretation, or semantic deduction from file content:
  - The parent LLM may read text, but must not treat any assumption as fact.
  - Every assumption/hypothesis/implicit interpretation must be delegated immediately to a fresh subagent for active rebuttal.
  - The subagent must start with parent context from the beginning (not optional, not deferred).
  - 1–6 Assumptions pro Scan: für JEDE einen Subagent spawnen (dynamisch).
  - Alle parallel rebuttal-berichte sammeln, vor parent-output ausgeben.
- Forbidden:
  - Direct intent/structure/error-cause conclusions from scan text without subagent rebuttal.
  - Skipping subagent step for speed.
  - Silent normalization of ambiguous tokens/paths/identifiers.
  - Implicit context fill-in by parent LLM.
