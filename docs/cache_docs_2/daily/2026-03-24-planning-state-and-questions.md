# Planning State (Evidence Mode)
Date: 2026-03-24

## Meaning of UNPROVEN
UNPROVEN = A claim exists, but there is no accepted hard evidence link (file:line) or no complete proof path yet.
UNPROVEN is blocked and cannot be used for write-ready decisions.

## Current evaluated state
- Mode: Evidence-only planning, no autonomous code write.
- Active principle: Only PROVEN items can stay in active queue.
- Result: Several earlier assumptions were dropped (converted to DROP).

## PROVEN right now
1. UI bypass risks exist (direct dispatch path, alt-click rebuild path, global hotkey/pointer mixing) in UI files.
2. Replay step-truth gap is real: replay currently records signatures but does not enforce per-step expected-signature comparison.
3. Scaffold/live mismatch is real for key actions (lifecycle vs matrix/dataflow/reducer wiring mismatch).
4. C0 baseline mismatch is real in test-ui-click-placement-e2e (invalid brush mode path in test setup).
5. Workflow requires preflight chain classify->entry->ack->check as mandatory policy.

## DROPPED (because not proven)
1. "typed-array leak exists now" -> dropped (no hard proof yet).
2. "missing lifecycle alignment test file" as hard claim -> dropped until machine-readable missing-file evidence task is produced.
3. "final determinism runner command is already stable" -> dropped (only partial command evidence exists).
4. Multiple gameplay/SoT claims from design side dropped where dual evidence (SoT + code) was incomplete.

## Open blockers (still real)
1. SoT contract gaps remain open (Build/Play/Inspect explicit runtime contract, MVP core action wiring, chamber/shadow/daily contract fields + runtime proof).
2. Lifecycle alignment gate is specified but not yet implemented as running test gate.
3. Sec-A/Sec-B gated tasks still require explicit GO before writes in those areas.

## Startable low-risk write (if user approves)
- C0a_TEST_FIX_INVALID_BRUSHMODE
- Scope: tests/test-ui-click-placement-e2e.mjs only
- Purpose: Fix baseline test mismatch without touching runtime behavior.

## User questions (must all be answered)
1. Soll ich sofort mit dem risikoärmsten Start beginnen: nur den Testfix C0a in einer Datei?
2. Willst du, dass ich strikt zuerst die Gate-Kette hart mache (Preflight + Wave-Runner), bevor irgendein Gameplay-Write startet?
3. Bei Konflikt: Soll immer diese Reihenfolge gelten: Sicherheit > Determinismus > Gameplay-Komfort > Tempo?
4. Für SoT-Lücke "Inspect": Reicht dir erstmal ein klarer read-only Modus mit Basis-Infos, oder soll Inspect direkt voll ausgebaut werden?
5. Für Chamber-Flow: Sollen wir als ersten sicheren Schritt nur den minimalen 2-Chamber-Nachweis bauen?
6. Für Daily: Reicht dir zunächst lokale Parität (gleicher Seed+Inputs => gleicher Hash), bevor wir Ranking/Online-Themen anfassen?
7. Für Topology/T3: Soll nur ein minimaler, belegbarer Wirkungspfad in MVP bleiben und alles Weitere später?
8. Bei unsicheren Behauptungen von Agenten: willst du automatische Regel "kein Beleg = sofort DROP" ohne Ausnahme?
9. Soll ich fehlende Belege immer als eigene Nachweis-Tasks erzeugen, statt weiter zu diskutieren?
10. Willst du, dass ich pro Zyklus maximal 1-2 Entscheidungen von dir einhole, damit es nicht zu viele Fragen auf einmal werden?
11. Sollen wir legacy-Actions sofort stilllegen, sobald ein Ersatzpfad PROVEN ist, oder erst nach einer Übergangsphase?
12. Soll ich bei jeder nächsten Frage bewusst alltagssprachlich bleiben und technische Begriffe vermeiden?

## Next proposed action after answers
- Rebuild active queue from your answers.
- Continue auto-cycles without idle, evidence-first.
