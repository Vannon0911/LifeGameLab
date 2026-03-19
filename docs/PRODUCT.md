# PRODUCT

Version: 1.1

## SoT Rule
This file is the product Source of Truth.
`docs/traceability/*` is derived planning evidence and must never override this document.

## Product Core
LifeGameLab is a deterministic browser RTS where the full system already exists at second zero.
There is no tutorial, no popup teaching, and no hidden helper flow.
The game teaches only through consequence.

The player starts with one worker, not with a menu.
The first strategic decision is where to found the first core by manually delivering five raw plants.

## Deterministic Foundation
- 24 ticks always equal one second.
- Same seed plus same MapSpec must produce the same world.
- RNG stays deterministic and replay-safe.
- Daily seeds, shadow runs and score verification are part of the product, not post-launch garnish.

## Match Structure
- Blitz uses a 32x32 grid.
- Standard uses a 64x64 grid.
- Krieg uses a 128x128 grid.
- Custom exists through the Map Builder pipeline and stays deterministic.

Grid size is gameplay identity, not a cosmetic knob.

## Economy
The economy is built on workers, not abstract build tokens.
Workers are simultaneously production, construction and military opportunity cost.

Canonical early numbers:
- Worker spawn costs 2 energy.
- Worker spawn takes 240 ticks.
- Worker break-even sits at 480 ticks.
- Plant energy fields output 1 energy every 120 ticks.

Three resource pillars define the match:
1. Plants become energy.
2. Plants can be reproduced into trees, then processed into wood.
3. Stone is a physical map resource and becomes fully useful at T3.

## Phase 0 And Core
Phase 0 is locked:
- the first core costs five raw plants
- energy does not exist before the first running core
- the word energy is absent from Phase 0 UX

The core is the canonical center of the economy:
- 4x4 footprint
- 0 to 100 pool per core
- single resource type at a time
- global queue of 10 units
- visible backpressure instead of silent void loss

The first core is permanent.
The second core costs energy and is unavailable before core one is running.

## Automation And T2
Automation is explicit production infrastructure:
- harvesters
- repro buildings
- sawmills
- conveyors
- lines

Conveyor rule:
- each segment consumes one worker permanently
- no upkeep beyond worker opportunity cost

T2 is defined by the core bottleneck:
- plants and wood compete for the same core
- the player must solve this via prioritization, splitter or double core

## T1, T2 And T3
T1 and T2 are built on the field and discovered by consequences.
T3 is the only extra window in the game.

T3 rules:
- one placeable mutator building
- scalable input canvas
- max 15 active nodes
- only closed patterns are valid
- rotated, mirrored or reversed equivalents collapse into the same topology class

Topology classes drive combat mutations:
- triangle
- square
- loop
- star
- spiral
- cross
- pentagram
- hexagram

## Conflict And CPU
Conflict is forced by world structure, not scripted events.
Three triggers define war:
- resource collision
- line contact
- CPU pressure

CPU is the only opponent in MVP.
Its strategy scaffold is deterministic and stays on three modes:
- EXPAND
- HOLD
- PRESSURE

CPU attacks lines, not the core.

## Win Conditions
Selectable win conditions for MVP:
- supremacy
- stockpile
- efficiency

Loss condition:
- dead core leads to no new workers and the run bleeds out

## MVP Scope
In scope:
- internal Map Builder P0
- 32, 64 and 128 grid sizes
- Phase 0
- core economy
- worker system
- plant, wood and stone pillars
- T1 and T2
- T3 mutator
- deterministic CPU scaffold
- line system
- context window interaction
- win conditions
- shadow runs and daily seed

Out of scope after MVP:
- player-facing community map editor
- double-core tuning polish
- full CPU behavior design
- cross-platform CI polish

## Current Migration Note
Current head is on the Slice B MapSpec baseline:
- old worker-RTS runtime still exists
- `SET_MAPSPEC` now stores canonical compile input before `GEN_WORLD`
- `GEN_WORLD` now compiles from `map.spec` when MapSpec is active
- legacy presets remain only as internal compile helpers until replacement wiring and tests exist

Deletion rule:
- delete only dead after replacement
