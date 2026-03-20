# KERNEL_AUDIT

Date: 2026-03-20

## Scope
Audit fuer Redundanz zwischen `src/kernel/*` und `src/core/kernel/*`.

## Befund
- `src/kernel/*` wird im Code aktiv referenziert (`kernel_refs=21`).
- `src/core/kernel/*` hat in `src/` aktuell keine aktiven Referenzen (`core_kernel_refs=0`).
- `src/core/kernel/*` ist aktuell eine Legacy-/Kompatibilitaets-Fassade mit Re-Exports.

## Aktive Kernel-Quelle (canonical today)
- `src/kernel/determinism/*`
- `src/kernel/store/*`
- `src/kernel/types/*`
- `src/kernel/validation/*`
- plus `src/kernel/shared/isPlainObject.js` (neu zur Entdopplung)

## Legacy-/Facade-Pfad
- `src/core/kernel/hash32.js`
- `src/core/kernel/patches.js`
- `src/core/kernel/persistence.js`
- `src/core/kernel/physics.js`
- `src/core/kernel/rng.js`
- `src/core/kernel/schema.js`
- `src/core/kernel/stableStringify.js`
- `src/core/kernel/store.js`

## Entscheidung (safe)
- **Kein sofortiges Loeschen von `src/kernel/*`.**
- Naechster Schritt fuer Konsolidierung: `src/core/kernel/*` als deprecate-compat belassen und schrittweise auf einen Pfad migrieren, abgesichert durch `test:quick` + `test:truth`.

## Bereits umgesetzte Redundanz-Reduktion
1. `isPlainObject` Utility zentralisiert in `src/kernel/shared/isPlainObject.js`.
2. Nutzung in:
- `src/kernel/store/createStore.js`
- `src/kernel/store/signature.js`
- `src/kernel/validation/validateState.js`

## Risiko-Hinweis
Der Vorschlag "alles nach `src/core/kernel/*` verschieben und `src/kernel/*` loeschen" waere aktuell high-risk, weil aktive Importe im Projekt auf `src/kernel/*` zeigen.
