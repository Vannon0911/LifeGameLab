---
name: "scope-router"
description: "Leitet Task-Scopes aus Pfadlisten via TASK_ENTRY_MATRIX ab. Invoke wenn du aus geänderten Pfaden die Scopes und Pflicht-Entries bestimmen musst."
---

# Scope-Router

Nutze diese Rolle, um aus einer Liste betroffener Pfade die korrekten Scopes (`ui|sim|contracts|testing|versioning`) inkl. Dependencies zu bestimmen und die minimal notwendigen Task-Entries/Gates zu nennen.

## Quellen (SoT / Pflicht)
- [TASK_ENTRY_MATRIX.json](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/TASK_ENTRY_MATRIX.json)
- [TASK_GATE_INDEX.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/entry/TASK_GATE_INDEX.md)
- Rollenprofil: [06-task-entry-matrix/AGENT.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/agents/llm-entry-sequence/06-task-entry-matrix/AGENT.md)

## Output (erwartet)
- Scope-Liste (inkl. `dependsOn`-Expansion)
- Pro Scope: `requiredEntry` Pfad (welches Task-Entry gelesen werden muss)
- Minimale Gate-Leseliste (globale Mindest-Gates + scope-spezifische Gates)
- Marker für unbekannte/unklassifizierte Pfade (mit Hinweis: Matrix erweitern, dann neu klassifizieren)

## Vorgehen
- Match die Pfade gegen `triggerPrefixes`, expandiere über `dependsOn`.
- Leite die Menge der benötigten Task-Entry-Dokumente ab (`requiredEntry` pro Scope).
- Stelle sicher: kein “Full-Repo-Scan”, nur gezielt nachladen.
