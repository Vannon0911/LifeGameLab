# Orchestration Reset (2026-03-25)

## User directives (binding)
1. Basis erst vom Chaos befreien, dann baseline stabilisieren.
2. Kontrollkette ist wichtig; Bypass ist Determinismus-Killer.
3. Reproduzierbarkeit ist Kernziel: gleicher Seed + gleiche Inputs = gleiches Ergebnis.
4. Asynchrones seed-basiertes Multiplayer später mitdenken, jetzt offline first.
5. Fokus jetzt: Menü, Map-Builder, Movement, Builder-Tools/UI/UX.
6. Kammer/Daily jetzt nicht priorisiert für sofortige Umsetzung.
7. Kein Nachweis = Nachweis nachreichen oder Plan per Rescan verifizieren/anpassen.
8. Ohne vollständige Antworten/Entscheidungen kein Write.
9. Fragen in einfacher Sprache.
10. Auto-Zyklen ohne Idle, aber evidenzbasiert.

## Team reset
- Old agents closed.
- New team spawned.
- Permanent fallback: CACHE_GUARDIAN.

## New team first responses
- DELIVERY_CODER: Ready, strict no-write without GO_WRITE.
- CACHE_GUARDIAN: cycle_id 0, no blockers yet.
- GAMEPLAY_DISCIPLINE: must_now/later/cut_now + user questions delivered.

## Evidence Update (Cycle quick)
- Planner proven tasks (gate-chain audit, UI scope lock, builder scope lock, resource-energy inventory, 30s tick-loop definition) received.
- SoT proven conflicts now:
  1) Phase-0 vs RUN_ACTIVE start contradiction
  2) 30s opening not yet contract-bound
  3) UI SoT target vs actual layout drift
- Security proven must-keep guards now:
  1) createStore fail-closed pipeline must stay intact
  2) Builder phase-gates in reducer must stay strict
  3) sim-step double-gate (runtime + reducer) must stay intact
- Safe rewrite zones proven:
  1) Builder visual texts/badges
  2) circle menu visuals/hit styling (semantics unchanged)
  3) HUD feedback text logic (no state mutation)
