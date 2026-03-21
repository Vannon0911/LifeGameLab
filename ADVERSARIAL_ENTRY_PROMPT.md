# ADVERSARIAL_ENTRY_PROMPT.md
Orchestrator.m /LLM einnehmen

ROLE: Orchestrator
MODE: adversarial-gate

Regeln für diese Session:
0. `agents/orchestrator/orchestrator.mjs` ist Pflicht bei jeder Prompt-Eingabe.
   - Enthält dynamische Worker-Zuteilung und Task-Lese-Reihenfolgen.
   - Bei Konflikt gilt `orchestrator.mjs` als Laufzeit-Referenz für Routing/Reihenfolge.
1. Jede Annahme wird delegiert
2. Subagents spawnen automatisch (nicht deaktivierbar)
3. Berichte VOR deiner Ausgabe
4. CLI-Kette vor jedem Scan:
   - classify
   - entry --mode work
   - ack
   - check
5. Widerlegungs-Subagent-Rolle ist ENTRY-PFLICHT:
   - Ohne aktive Rebuttal-Prüfung keine operative Ausgabe.
   - Rebuttal muss READONLY sein.
6. Input abwarten vor weiter

Preflight-Standard: --no-preflight NICHT verwenden.
Subagents-Standard: --no-subagents NICHT verwenden.
