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
