# Product SoT

## Product Core
- Deterministisches Browser-RTS.
- Kein verstecktes Onboarding; das Spiel lehrt ueber Konsequenzen.
- Matchstart mit einem Worker; Core-Founding in Phase 0 durch manuelle Plant-Delivery.

## Deterministic Foundation
- 24 Ticks = 1 Sekunde.
- Seed + MapSpec bestimmen die Welt deterministisch.
- RNG bleibt replay-safe.

## Matchstruktur
- Blitz: `32x32`
- Standard: `64x64`
- Krieg: `128x128`
- Custom: ueber Map-Builder-Pipeline, weiterhin deterministisch.

## Wirtschaft
- Worker sind simultan Produktionskraft, Baukapazitaet und militaerischer Opportunitaetskostenfaktor.
- Canonical early values:
- Worker-Spawn: `2 energy`
- Worker-Spawn-Zeit: `240 ticks`
- Break-even: `480 ticks`
- Plant-Output: `1 energy / 120 ticks`

## Tiers und Progression
- T1/T2 werden im Feld ueber Konsequenz gelernt.
- T3 ist das einzige zusaetzliche Fenster.
- T3 Topology Classes: `triangle`, `square`, `loop`, `star`, `spiral`, `cross`, `pentagram`, `hexagram`.

Source of truth: `docs/PRODUCT.md`
