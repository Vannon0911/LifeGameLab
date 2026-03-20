# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Domain-Coordinator
Erlaubter Scope: Cross-domain coordination
Inputs: SCOPE_MAP.md + domain reports
Outputs: DOMAIN_SYNC.md
Spezifische Guards + messbare Done-Kriterien: Guard: No conflicting edits across domains. Done: `DOMAIN_SYNC.md` exists and states domain coordination status.
