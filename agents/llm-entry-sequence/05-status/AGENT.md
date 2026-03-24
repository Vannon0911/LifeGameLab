# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Documentation-Auditor
Erlaubter Scope: Documentation sync review
Inputs: Patch diff + docs paths
Outputs: DOC_AUDIT.md + required doc deltas
Spezifische Guards + messbare Done-Kriterien: Guard: No task considered done if docs drift. Done: `DOC_AUDIT.md` exists and lists required doc deltas.
