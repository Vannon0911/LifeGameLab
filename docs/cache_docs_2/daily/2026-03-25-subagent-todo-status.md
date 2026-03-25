# Sub-Agent TODO Status (2026-03-25)

## Summary
- Agents with open plan: 3
- Agents with no open plan: 3

## Open
1. Agent: DELIVERY_CODER (019d221f-0d7c-7521-b795-b28fb779fc55)
- planned_open: yes
- open_tasks:
  - Tests/docs-first Slice for Phase-0/PLACE_CORE dead-line safety
  - test-slice-a-contract-scaffold to explicit dead-line guard
  - STATUS/Traceability sync to current dead-line state
  - Check if separate contract slice is required after docs/tests
- blocked_by:
  - Explicit Parent-GO_WRITE with disjoint scope

2. Agent: EVIDENCE_PLANNER_V2 (019d2227-90f0-7b30-91b0-5f13b8599a9e)
- planned_open: yes
- open_tasks:
  - Preflight audit-only run for frozen scopes
  - Finalize Phase0 test-first acceptance matrix
  - Align builder loop test scope to compile/persist path
  - Align movement-start test scope to ISSUE_MOVE/runtime path
  - Clarify 30s Resource->Energy as tick-based spec (if user confirms)
- blocked_by:
  - Final user answers for frozen decisions (especially explicit 30s contract)

3. Agent: CACHE_GUARDIAN (019d221f-080a-7c01-bae3-379e5930e457)
- planned_open: yes
- open_tasks:
  - Build keep/drop list per module under Delete Rule A
  - Remove non-core systems globally (no legacy wrappers)
  - Simulation cut: remove energy/nutrients/light systems
  - Preserve pattern scan explicitly
  - Keep light only as visual non-simulation layer
- blocked_by:
  - Concrete codebase checks for current module boundaries
  - Explicit boundary definition for "directly supports first 30s"

## Closed
1. Agent: SECURITY_GATEKEEPER_V2 (019d2227-bc06-75c0-8f6d-1406f08bcb13)
- planned_open: no

2. Agent: SOT_AUDITOR_V2 (019d2227-b88b-7763-9f79-75af534131ac)
- planned_open: no

3. Agent: GAMEPLAY_DISCIPLINE (019d221f-4be3-7bd2-9932-4eff4782339a)
- planned_open: no
