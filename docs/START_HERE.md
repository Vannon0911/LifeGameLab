# START HERE

## Zweck
Diese Basis friert einen gemeinsamen Startzustand ein: Code, Test-Suite, Produkt-Scope und Arbeitsprotokoll liegen gemeinsam im Projekt. Damit muss später niemand mehr so tun, als hätte sich die Architektur zufällig selbst dokumentiert.

## Reihenfolge
1. `README.md`
2. `docs/LLM_ENTRY.md`
3. `docs/SCOPE_BASELINE.md`
4. `docs/LLM_OPERATING_PROTOCOL.md`
5. `docs/TASK_SEQUENCE.md`
6. `docs/PROJECT_STRUCTURE.md`
7. danach erst Codeänderungen

## Regeln
- Immer nur **ein Task** gleichzeitig.
- Task darf nur in **einer Layer** arbeiten.
- Nur **ALLOWED FILES** ändern.
- Bei STOP-Markern anhalten und validieren.
- Keine Logik-Erweiterungen außerhalb des expliziten Scopes.
- Es gelten nur die kanonischen Pfade unter `src/app`, `src/core`, `src/game` und `src/project`.
- Operative Doku wird nur unter `docs/` gepflegt.
- `docs/MASTER_CHANGE_LOG.md` wird nur erweitert, nie gekürzt oder ersetzt.
