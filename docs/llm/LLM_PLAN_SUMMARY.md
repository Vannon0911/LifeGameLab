# LLM Plan Snapshot (2026-03-25)

## Kontext & aktueller Gate-Status
- Die Red-Team-Session (`docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:1-154`) dokumentiert alle kritischen Gate-Bypässe, Blocker und MVP-Slices (RT-01..RT-07, S1–S6). Ein Entry-Hash-Drift plus Rebuttal-Opt-out halten das Write-Gate derzeit auf FAIL; die Doku wurde deshalb bereits um klare Nachweisverweise erweitert (`docs/llm/ENTRY.md:37-49`).
- Die Pflichtkette bleibt fest: `agents/orchestrator` → `classify` → `entry` → `ack` → `check` → Commit, und jede Annahme muss mit Beleg/Frage bestätigt (`docs/WORKFLOW.md:20-60`).
- Der Cache-Agent (Avicenna) hält nachweisbasierte Regeln bereit (`docs/llm/ENTRY.md:37-49`) und synchronisiert vor/nach jedem Task; alle zusätzlichen Cache-Vorgaben und Rebuttal-PASS-Bedingungen wurden in `docs/llm reports/SESSION_WRITE_GATE_REPORT.md` festgehalten.

## Documentation Slices (D1–D4)
1. **D1 – Kanonische Lesereihenfolge präzisieren** (`docs/WORKFLOW.md:20-29`, `docs/llm/entry/TASK_GATE_INDEX.md:8`). Ziel: `ENTRY`/`OPERATING_PROTOCOL` als Vollreihenfolge, `TASK_GATE_INDEX` als komplementären Minimal-Index, ohne Austausch.
2. **D2 – Versioning-Preflight-Beispiele auf minimalen Scope reduzieren** (`docs/llm/versioning/VERSIONING_TASK_ENTRY.md:22-27`). Nur `package.json` und `src/game/contracts/manifest.js` sind in der Standardkette; `docs/ARCHITECTURE.md` und `docs/STATUS.md` nur, wenn der Task betroffen ist.
3. **D3 – Versioning-Pflichtliste auf Minimalprinzip bringen** (`docs/llm/entry/TASK_GATE_INDEX.md:49-54`). Doku, Manifest, STATUS/ARCHITECTURE nur bei Scope-Betroffenheit laden.
4. **D4 – Begriffsklärung verpflichtender Referenzquellen** (`docs/llm/ENTRY.md:57-76`). Projekt-Doku und Traceability werden explizit aufgeführt, damit jede Scope-Erweiterung den Right-Order-Check durchläuft.

## Security Slices (S1–S4 & Zusatz)
1. **S1 – API/Dry-Run Preflight-Bypass schließen** (`docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:115-123`, RT-01/RT-02; `agents/orchestrator/orchestrator.mjs:797/812-813`). Ziel: `preflight:false` und `dry-run` dürfen die Kette nicht mehr überspringen.
2. **S2 – Pfadlose Läufe sind fail-closed** (`docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:123`, RT-03; `agents/orchestrator/runtime/session.mjs:25`). Jeder Run braucht mindestens eine validierte `paths`-Liste.
3. **S3 – File-Scan-Resolution fail-closed** (`docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:131`, RT-05; `agents/orchestrator/orchestrator.mjs:323-331`). Null-Targets lösen sofort einen klaren Fehler aus.
4. **S4 – Consent-gebundenes Rebuttal-Opt-out** (`docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:127`, RT-04; `agents/orchestrator/orchestrator.mjs:372/414`, `cli.mjs:48`). Opt-out nur mit nachweisbarer Governance-Freigabe; sonst Block.
5. **S5 – Regressionstests ergänzen** (`docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:135-150`, RT-06/RT-07). `tests/test-llm-contract.mjs` muss die neuen Guard-Ketten explizit abdecken.
6. **S6 – Cache & Rebuttal-Harden** (`docs/llm/ENTRY.md:37-49` + `docs/llm reports/SESSION_WRITE_GATE_REPORT.md`). Alle Annahmen, Open Points und TODO-Slices werden über Cache-Sync + Rebuttal-Gate per Agenten statistisch abgesichert.

## Evidenz-Fluss & Verantwortlichkeiten
- **Dokumentation**: `PLAN_DOC_OWNER` (Arendt) aktualisiert `WORKFLOW`, `TASK_GATE_INDEX`, `VERSIONING_TASK_ENTRY` und ENTRY with direct citations; `SCANNER_DOC_AUDITOR` (Pauli) bestätigt Drift-Checks. Nach jeder Änderung wird die Report-Datei (`docs/llm reports/SESSION_WRITE_GATE_REPORT.md`) aktualisiert und Rebuttal (Raman) prüft PASS/FAIL.
- **Security**: `PLAN_SECURITY_OWNER` (Pasteur) koordinierte CLI/Runtime-Checks; `SCANNER_SECURITY_AUDITOR` (Plato) liefert Bypass-Flächen (API, Dry-Run, Empty paths, Scan, Consent); `REBUTTAL_GATE_KEEPER` (Raman) entscheidet über Blocker.

## Nächste 48h-Aktionen
1. **Tag 1**: `S1/S2` in `agents/orchestrator/orchestrator.mjs`, `cli.mjs`, `runtime/session.mjs` umsetzen, Preflight-Bypass und pathless Runs fail-closed machen; danach `update-lock` + Gate-Kette + Rebuttal-Pass für veränderte Docs.
2. **Tag 2**: `S3/S4` (Scan-Resolution, Consent-Opt-out) einbauen, `tests/test-llm-contract.mjs` erweitern (S5), dann das Release mit Changelog, README-Update und Report-Cache prüfen und committen.
3. **Parallel**: Red-Team-Report und Cache-Status in `docs/llm reports` kontinuierlich aktualisieren; jeder neue Write referenziert die dort gelisteten Belege (RT-01..RT-07, S1–S6).

## Zusammenfassung
- Priorität hat das Herausreißen der Gate-Bypässe (S1–S4) und der dazugehörigen Tests (S5). Jede Aussage wird mit einem Referenzpfad (siehe oben) gegen den Report `docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md` abgesichert.
- Die Dokumentation (D1–D4) bildet den lesbaren Vertrag; ohne vollständige Nachweis-Verlinkung bleiben die gesetzlichen Gates auf ROT.
- Wir liefern innerhalb von 2 Tagen: (1) einen getesteten Preflight-Hardening, (2) ein konsistentes Changelog/README, (3) einen aktualisierten Report-Cache, (4) eine klare Rebuttal-Abnahme und (5) die finale `LLM_PLAN_SUMMARY.md` als Referenz.
