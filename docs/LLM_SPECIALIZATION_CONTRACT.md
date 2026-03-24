# LLM_SPECIALIZATION_CONTRACT

Version: 1.0
Date: 2026-03-20

## Ziel
Redundanz zwischen Agent-Rollen und Skill-Wrappern reduzieren und auf einen kanonischen Rollensatz fokussieren.

## Kanonische Zielrollen (9)
1. task-orchestrator
2. protocol-enforcer
3. architecture-guardian
4. arbiter-coder
5. ui-coder
6. sim-coder
7. contract-coder
8. test-engineer
9. versioning-release

## Merge-/Deprecation-Mapping
- scope-router -> merged into task-orchestrator
- domain-coordinator -> merged into task-orchestrator
- quality-reviewer -> merged into test-engineer
- documentation-auditor -> merged into versioning-release
- gate-compliance-checker -> merged into protocol-enforcer

## Strukturregel
- `agents/llm-entry-sequence/*/AGENT.md` bleibt Rollenvertrag.
- `.trae/skills/*` bleibt Runtime-Skill-Quelle.
- Redundante Wrapper in `agents/llm-entry-sequence/*/SKILL.md` duerfen als Deprecation-Alias bestehen.

## Governance
- Keine Loeschung kritischer Rollen ohne nachweisbaren Runtime-Ersatz.
- Merge-Schritte sind low-risk dokumentarisch zuerst, dann runtime-seitig.
- Jede Struktur-Aenderung durchlaeuft `classify -> entry -> ack -> check`.
