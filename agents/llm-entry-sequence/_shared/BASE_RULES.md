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

No writing without a green `check`. Full rules: `docs/llm/entry/ENTRY_ENFORCEMENT.md`.

## Adversarial Scan Gate (Hard)

- Before every file scan, file parse, file interpretation, or semantic deduction from file content:
  - The parent LLM may read text, but must not treat any assumption as fact.
  - Every assumption/hypothesis/implicit interpretation must be delegated immediately to a fresh subagent for active rebuttal.
  - The subagent must start with parent context from the beginning (not optional, not deferred).
  - One assumption = one new subagent; no reuse across assumptions.
  - Parent output may use statements only after rebuttal is attached.
- Forbidden:
  - Direct intent/structure/error-cause conclusions from scan text without subagent rebuttal.
  - Skipping subagent step for speed.
  - Silent normalization of ambiguous tokens/paths/identifiers.
  - Implicit context fill-in by parent LLM.
