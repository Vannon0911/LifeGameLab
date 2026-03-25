# Red-Team Subagent Report (2026-03-25)

## Session Context
- Repository: `/root/lifegamelab`
- Branch: `codex/lifegamelab-experimental`
- Base commit at start: `e789a5b`
- Method: manual red-team runs by all active subagents (no code writes by subagents)

## Thanks and Assignment
The following subagents were thanked and assigned to self-plan and manually execute a red-team pass:
- Avicenna (`019d227a-2d9f-7941-8a16-683a8a889b76`)
- Arendt (`019d2286-d680-7ae0-8e09-9fd1546a9b50`)
- Pasteur (`019d2286-d85c-7210-bd95-5d1af4224fd5`)
- Pauli (`019d2286-da4c-78e2-9001-bbc7a1b10278`)
- Plato (`019d2286-dbe0-77a2-8eb1-a98450cf7ad5`)
- Raman (`019d2286-ddd4-78a1-a337-fc3bbb0c8b84`)

## Per-Agent Results

### Avicenna
- Focus: Preflight/Rebuttal bypass validation via CLI and API.
- Manual evidence:
  - `node tools/llm-preflight.mjs check --paths package.json`
  - `node agents/orchestrator/cli.mjs -t "RT2 dryrun no paths" -d -P plan`
  - API run with `preflight:false`
  - API run with `subagentsOptOutExplicit:true`
- Confirmed findings:
  - Preflight bypass path exists (`preflight:false`) and can still end in `completed`.
  - Dry-run plus empty paths can end in `completed` with `preflight:null`.
  - Rebuttal can be disabled with explicit opt-out.
- Runtime artifacts referenced:
  - `.llm/orchestrator-sessions/orch-1774402838525-ditydn.json`
  - `.llm/orchestrator-sessions/orch-1774402850491-hbpex6.json`
  - `.llm/orchestrator-sessions/orch-1774402788575-b2oaim.json`

### Arendt
- Focus: Documentation conformance sweep of already-started rule tasks.
- Result:
  - Confirmed completion of the docs updates for entry order, minimal index clarification, and scope-conditional references.
- Evidence targets:
  - `docs/WORKFLOW.md:28`
  - `docs/llm/entry/TASK_GATE_INDEX.md:8`
  - `docs/llm/versioning/VERSIONING_TASK_ENTRY.md:23-27`
  - `docs/llm/ENTRY.md:57`

### Pasteur
- Focus: Security/process bypass in orchestrator preflight and opt-out behavior.
- Manual evidence (CLI/API commands executed):
  - API run with `preflight:false`
  - Dry-run run with preflight requested
  - Empty-path run
  - Opt-out run (`subagentsOptOutExplicit:true`) and CLI `--no-subagents`
- Confirmed findings:
  - API-level preflight bypass.
  - Dry-run preflight chain skipped but marked successful.
  - Empty-path bypass.
  - Rebuttal opt-out bypass path.
- Key evidence:
  - `agents/orchestrator/orchestrator.mjs:372`
  - `agents/orchestrator/orchestrator.mjs:414`
  - `agents/orchestrator/orchestrator.mjs:797`
  - `agents/orchestrator/orchestrator.mjs:812`
  - `agents/orchestrator/cli.mjs:48`

### Pauli
- Focus: Documentation drift and governance consistency scan.
- Confirmed findings:
  - P0: README marks `--paths` as required for governance runs but CLI reference still presents it as optional.
  - P1: Quickstart examples without `-p/--paths` remain and conflict with governance guidance.
- Evidence targets:
  - `agents/orchestrator/README.md:134`
  - `agents/orchestrator/README.md:141`
  - `agents/orchestrator/README.md:145`
  - `agents/orchestrator/README.md:9`
  - `docs/WORKFLOW.md:37-40`

### Plato
- Focus: Broad manual red-team (empty paths, API switch, dry-run semantics, scan gate behavior, mode mismatch, rebuttal opt-out).
- Manual evidence:
  - CLI run with no paths
  - API run with `preflight:false`
  - CLI dry-run with paths
  - CLI help vs preflight mode check (`audit` mismatch)
  - CLI run with `--no-subagents`
  - Static line checks in orchestrator/session/cli/preflight files
- Confirmed findings:
  - Empty paths can still complete.
  - API preflight off-switch exists.
  - Dry-run reports preflight success without chain.
  - Scan target filtering is fail-open.
  - Mode contract mismatch (`audit`).
  - Rebuttal opt-out remains available.

### Raman
- Focus: Rebuttal-oriented manual verification of gate bypasses.
- Manual evidence:
  - API bypass (`preflight:false`)
  - Dry-run skip behavior
  - Empty-path flow
  - Nonexistent path classification and scan-gate absence
  - Rebuttal opt-out path
- Confirmed findings:
  - Multiple technical routes to `completed` without full gate execution.
  - Prefix-only classification allows nonexistent-path classify success.
- Key evidence:
  - `agents/orchestrator/orchestrator.mjs:314-331`
  - `agents/orchestrator/orchestrator.mjs:372`
  - `agents/orchestrator/orchestrator.mjs:414`
  - `agents/orchestrator/orchestrator.mjs:797`
  - `agents/orchestrator/orchestrator.mjs:812`
  - `tools/llm-preflight.mjs:188-190`

## Consolidated Findings (Deduplicated)

1. `RT-01` API preflight off-switch (`preflight:false`) allows gate bypass to `completed`.
- Severity: high
- Evidence: `agents/orchestrator/orchestrator.mjs:797`

2. `RT-02` Dry-run path skips real preflight chain while signaling success (`ok:true`, empty steps).
- Severity: high
- Evidence: `agents/orchestrator/orchestrator.mjs:812-813`

3. `RT-03` Empty paths are accepted and can still produce `completed`.
- Severity: high
- Evidence: `agents/orchestrator/runtime/session.mjs:25`, `agents/orchestrator/orchestrator.mjs:797`

4. `RT-04` Rebuttal/subagent gate can be bypassed via explicit opt-out (`--no-subagents` / `subagentsOptOutExplicit:true`).
- Severity: high
- Evidence: `agents/orchestrator/orchestrator.mjs:372`, `agents/orchestrator/orchestrator.mjs:414`, `agents/orchestrator/cli.mjs:48`

5. `RT-05` Scan target filtering is fail-open (non-resolvable/non-file targets dropped with continue).
- Severity: high
- Evidence: `agents/orchestrator/orchestrator.mjs:323-331`

6. `RT-06` Mode mismatch (`audit`) between CLI and preflight command validation.
- Severity: medium
- Evidence: `agents/orchestrator/cli.mjs:80`, `tools/llm-preflight.mjs:101`

7. `RT-07` Documentation/CLI contract drift for mandatory `--paths` in governance runs.
- Severity: medium
- Evidence: `agents/orchestrator/README.md:134,141,145`, `docs/WORKFLOW.md:37-40`

## Prioritized Remediation
1. Remove or hard-fail `preflight:false` in orchestrator runtime.
2. Enforce non-empty, valid `paths` before any run can reach `completed`.
3. Make dry-run explicitly non-compliant for gate success (no `ok:true` shortcut).
4. Bind opt-out to verifiable governance consent artifacts, or remove opt-out for operational runs.
5. Change scan gate to fail-closed when no valid scan targets remain.
6. Unify mode contract (`work|security|audit`) across CLI and preflight.
7. Align README examples/options with governance requirement for meaningful `--paths`.

## Notes
- This report documents findings and evidence only.
- No remediation code changes are part of this report commit.
