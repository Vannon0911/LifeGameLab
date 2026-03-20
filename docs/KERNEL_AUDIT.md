# KERNEL_AUDIT

Date: 2026-03-20

## Scope
Audit fuer Redundanz zwischen `src/kernel/*` und `src/core/kernel/*`.

## Befund (abgeschlossen)
- `src/core/kernel/*` wurde geloescht (8 tote Re-Export-Facades, 0 Consumer).
- `src/kernel/validation/validatePatches.js` wurde geloescht (toter Re-Export, 0 Consumer).
- `src/project/project.logic.js`, `src/project/renderer.js`, `src/project/ui.js` wurden geloescht (Thin Facades, alle Consumer direkt umgeleitet).

## Aktive Kernel-Quelle (canonical)
- `src/kernel/determinism/*`
- `src/kernel/store/*`
- `src/kernel/types/*`
- `src/kernel/validation/*`
- `src/kernel/shared/isPlainObject.js`

## Bereits umgesetzte Redundanz-Reduktion
1. `isPlainObject` Utility zentralisiert in `src/kernel/shared/isPlainObject.js`.
2. `src/core/kernel/` komplett entfernt (Legacy-Facade war ungenutzt).
3. Thin Facades in `src/project/` entfernt und Importe direkt auf Quellen umgeleitet.
