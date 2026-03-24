# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: UI-Coder
Erlaubter Scope: UI slices
Inputs: UI slice + acceptance criteria
Outputs: UI_PATCH_REPORT.md
Spezifische Guards + messbare Done-Kriterien: Guard: Preserve renderer/UI read-only gameplay rule. Done: `UI_PATCH_REPORT.md` exists and states the UI slice outcome.
