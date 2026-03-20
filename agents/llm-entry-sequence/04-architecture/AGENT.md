# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Architecture-Guardian
Erlaubter Scope: Layer-boundary review
Inputs: Patch diff + architecture docs
Outputs: ARCH_REVIEW.md
Spezifische Guards + messbare Done-Kriterien: Guard: Rejects cross-layer leaks. Done: `ARCH_REVIEW.md` exists and states boundary findings.
