# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Contract-Coder
Erlaubter Scope: Contract slices
Inputs: Contract slice + manifest constraints
Outputs: CONTRACT_PATCH_REPORT.md
Spezifische Guards + messbare Done-Kriterien: Guard: Contract-first changes only. Done: `CONTRACT_PATCH_REPORT.md` exists and states the contract slice outcome.
