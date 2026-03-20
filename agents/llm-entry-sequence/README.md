# LLM Entry Worker Map

## Purpose
This directory defines role prompts for the LLM layer only.
It does not replace repo truth, task classification, or preflight state.

## SoT Hierarchy
1. `src/project/contract/manifest.js`
2. `docs/llm/ENTRY.md` and `docs/llm/OPERATING_PROTOCOL.md`
3. `docs/llm/entry/TASK_GATE_INDEX.md`
4. `docs/llm/TASK_ENTRY_MATRIX.json`
5. `agents/llm-entry-sequence/README.md` and `_shared/*`

## Operating Boundary
- The orchestrator coordinates slices and hand-offs.
- The orchestrator is never authoritative over `classify -> entry -> ack -> check`.
- Technical truth for scope, entry state, and write permission stays in `tools/llm-preflight.mjs`.
- No role in this directory may create a shadow workflow, shadow scope map, or shadow source of truth.

## Shared References
- Common mission and collaboration rules: `agents/llm-entry-sequence/_shared/BASE_RULES.md`
- Common minimum done criteria: `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

## Role Matrix
| Path | Role | Allowed Scope | Primary Output |
| --- | --- | --- | --- |
| `01-workflow` | Task-Orchestrator | LLM-layer coordination only | `PLAN.md` |
| `02-entry` | Arbiter-Coder | Approved slice implementation | `PATCH.md` |
| `03-operating-protocol` | Protocol-Enforcer | Protocol and invariant review | `PROTOCOL_REPORT.md` |
| `04-architecture` | Architecture-Guardian | Layer-boundary review | `ARCH_REVIEW.md` |
| `05-status` | Documentation-Auditor | Documentation sync review | `DOC_AUDIT.md` |
| `06-task-entry-matrix` | Scope-Router | Scope interpretation against matrix output | `SCOPE_MAP.md` |
| `07-task-gate-index` | Quality-Reviewer | Test and regression review | `QUALITY_REPORT.md` |
| `08-scope-entries` | Domain-Coordinator | Cross-domain coordination | `DOMAIN_SYNC.md` |
| `08-scope-entries/01-ui` | UI-Coder | UI slices | `UI_PATCH_REPORT.md` |
| `08-scope-entries/02-sim` | SIM-Coder | SIM slices | `SIM_PATCH_REPORT.md` |
| `08-scope-entries/03-contracts` | Contract-Coder | Contract slices | `CONTRACT_PATCH_REPORT.md` |
| `08-scope-entries/04-testing` | Test-Engineer | Testing slices | `TEST_REPORT.md` |
| `08-scope-entries/05-versioning` | Versioning-Release | Versioning/governance slices | `VERSION_REPORT.md` |
| `09-global-minimum-gates` | Gate-Compliance-Checker | Final gate review | `GATE_REPORT.md` |

## SoT Conflict Resolution

When two sources in the SoT Hierarchy directly contradict each other, the lower-numbered (higher-authority) source wins.

- LESEN read-order ≠ authority order. Reading Matrix before Gate-Index is required for orientation, but Gate-Index (rank 3) overrules Matrix (rank 4) on direct conflicts.
- Escalation format: `[SOT-CONFLICT: Rank X overrides Rank Y – <reason>]`. Log the marker in the session before proceeding.
- Full priority chain: `manifest.js` > `ENTRY + OPERATING_PROTOCOL` > `TASK_GATE_INDEX` > `TASK_ENTRY_MATRIX` > `Worker-README + _shared/*`. ENTRY and OPERATING_PROTOCOL share rank 2; neither overrides the other – conflicts between them require manual resolution.

## Ownership Rule
- These files define role behavior only.
- Product-code edits remain constrained by the repo ruleset and active preflight state.
