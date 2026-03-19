# LLM Entry Worker Map

Source order extracted from docs/llm/ENTRY.md section Pflicht-Lesereihenfolge (ohne Vollscan).

## Max Worker Layout
- 9 sequence workers (01..09)
- 5 sub-workers under 08-scope-entries
- total worker directories: 14

## Sequence
1. 01-workflow
2. 02-entry
3. 03-operating-protocol
4. 04-architecture
5. 05-status
6. 06-task-entry-matrix
7. 07-task-gate-index
8. 08-scope-entries (01-ui, 02-sim, 03-contracts, 04-testing, 05-versioning)
9. 09-global-minimum-gates

## Ownership Rule
Each worker owns only its own directory and writes:
- AGENT.md
- SKILL.md
- REPORT.md (execution output, currently not generated)