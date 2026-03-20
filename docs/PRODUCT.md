# PRODUCT

Version: 1.6
Type: Architecture Manifest & System Contract
Status: Consolidated (Player Fantasy, Design Locks, Engine Contract)
Premise: "Factorio meets The Binding of Isaac"; automation fuels synergy chaos.

## SoT Rule
This file is the product Source of Truth.
`docs/traceability/*` is derived planning evidence and must never override this document.

## Version Boundary (Non-Negotiable)
- v1.4 owns simulation hardening: determinism, replay, seed hierarchy, state discipline, verification.
- v1.5 owns world contract: rendering, grid, tile semantics, builder/runtime language, layering, UI frame.
- v1.6 is the harmonized consolidation of both without duplication.

## Changelog v1.4 -> v1.5 (Harmonized)
- NEW: 1c Render Contract / Interpolation
- NEW: 1d Simulation Truth vs Presentation Truth
- NEW: 2a Grid Scale / Tile Scaling
- NEW: 18b Tile Semantics / Builder Contract
- NEW: 18c Layer System / World Construction
- NEW: 18d Builder/Runtime Language Equality
- NEW: 24 Visual Direction / Art Direction
- NEW: 25 UI Frame / World Before Report
- NEW: 25a UI Reset Away from Sim Panel
- CHANGED: 18 Map Builder now includes shared editor/runtime vocabulary
- CHANGED: 21 MVP scope now includes grid, render, and UI fundamentals
- CHANGED: 22 Canonical locks extended for render, grid, builder, and UI constraints
- CHANGED: 23 Open points reduced to unresolved decisions only

---

## Layer 1: Player-Facing Fantasy

### 1.1 Core Philosophy: Rogue-lite Factory Run
- The game is a run, not an endless sandbox.
- You start in an isolated chamber, build under pressure, clear CPU/boss presence, and move to the next chamber.
- Death is contractual: if the core dies, the run ends.
- Discovery beats instruction: no tutorial flow, no hidden hand-holding.

### 1.2 Visual Leitmotif: Clean Tactical Pixel
- Strict geometry readability plus organic escalation.
- Structure before surface.
- No color lies: function and elevation must be readable by shape/edge, not color alone.
- Grayscale test is mandatory for relevant gameplay elements.
- Deeper run stages escalate mutation and projectile absurdity while factory readability stays clean.

### 1.3 UI Frame: World Before Report
- Map is the primary product surface.
- UI sends orders and context; it does not replace world truth.
- Modes: `Build`, `Play`, `Inspect`.

### 1.4 T3 Experience: The Item-Room Moment
- T3 is not just another tech tier; it is the run's synergy core.
- Topology-driven mutation classes stack into extreme combinations.
- Community discovery is expected: seed + drawing sharing is part of the intended loop.

### 1.5 Shadow Runs and Dungeon Curation
- Community chambers are assembled into deterministic dungeon runs.
- Daily seed runs are identical across players.
- Scoring is deterministic and hash-verifiable.

---

## Layer 2: Canonical Locks

### 2.1 Chamber Structure
- Logical tile basis: `24x24`.
- Visible tile size: `48x48 px` (`x2` integer scaling).
- Typical chamber dimensions: `32x32` and `64x64`.
- No `128x128` endless-map behavior in canonical rogue-lite chamber mode.
- Chamber exits unlock only after CPU presence is cleared.

### 2.2 Time and Speeds
- Heartbeat: `24 ticks = 1 second`.
- Standard unit speed: `12 ticks per tile`.
- Conveyor normal: `6 ticks per tile`.
- Conveyor fast: `4 ticks per tile`.

### 2.3 Economy and Core
- Phase 0 lock: first core requires 5 raw plants.
- Energy does not exist before the first core runs.
- Core footprint: `4x4`.
- Core death ends the run.
- Between chambers, only limited resources/energy plus T3 mutations carry over; buildings do not.

### 2.4 Conveyors and Logistics
- Conveyor segment cost: 1 worker permanently consumed.
- Direction is fixed on placement.
- Automation is both economy and weapon system (resource-fed defense chains).

### 2.5 CPU and Bullet-Hell Pressure
- CPU attacks and blocks lines.
- Chamber endgame transforms into pressure combat where logistic uptime is survival-critical.
- CPU expansion is deterministic from defined spawn sources.

### 2.6 T3 Mutator Validity Rules
- Max active nodes: 15.
- Closed cycle required (`start == end`).
- At least 3 different node types.
- Intersections and star polygons allowed.
- Interior points cannot be revisited.
- Mirrored/reversed drawings collapse to the same class.

### 2.7 Scaling Lock
- Integer scaling only.
- No fractional scaling.
- No soft upsampling.
- No mixed crisp/blur render paths.

### 2.8 Height and Functional Readability
- Height must be communicated by at least two of: edge/side, brightness split, shape separation, shadow edge.
- Height and function may never be conveyed by color alone.
- Grayscale readability is mandatory for all gameplay-relevant elements.

---

## Layer 3: Engine Contract

### 3.1 Simulation Contract and State Discipline
- UI is dispatcher-only.
- Simulation is source of truth.
- Same dungeon seed + same inputs => same run and same verification hash.

### 3.2 Render Contract and Interpolation
Allowed visual interpolation:
- Units
- Items
- Projectiles
- Cursor
- Selection
- Build preview
- Purely visual, rule-neutral transitions

Forbidden interpolation:
- Terrain
- Topology
- Collision
- Reachability
- Blocker borders
- Height edges
- Rule-relevant capture state
- Sim-relevant tile membership

Rule of thumb:
- Rules jump on the grid.
- Motion can glide in presentation.
- Interpolation is comfort, grid is truth.

### 3.3 Simulation Truth vs Presentation Truth
- Presentation may expose simulation state, never define new rule state.
- Any gameplay-relevant information must exist in sim state or be deterministically derived from it.

### 3.4 Tile Semantics and Builder Contract
Each tile must define:
- `baseType`
- `elevation`
- `collision`
- `connectionType`
- `interactable`
- `variant`
- `theme`

Contract:
- Builder and runtime use identical semantic language.
- Theme swaps may alter look, not world logic.
- World logic may not be hidden in rendering only.

### 3.5 Layer System Lock
Canonical layer stack:
1. Base Ground (grass/stone/void etc.)
2. Topology (raised edge/ramp/pit/bridge etc.)
3. Structure (wall/blocker/foundation/resource node)
4. Gameplay (spawn/capture/conveyor/interaction/hazard)
5. Overlay (selection/range/path/ownership/build preview/debug)

Layer rule:
- Higher layers may visually cover lower layers.
- They may not semantically replace lower-layer logic evaluated by runtime.

### 3.6 Seed and Verification Hierarchy
- Dungeon seed defines chamber selection/order.
- MapSpec defines initial chamber state.
- Run seed defines deterministic runtime RNG behavior.
- Input sequence defines player decisions.
- Sim core computes the resulting run.

Result:
- Relevant simulation states are deterministic and hash-verifiable.
- Desync is a contract violation.
- Replay reconstructs the run from input sequence frame-by-frame.

---

## MVP Scope (Consolidated)

### In Scope
- World-centered UI reset
- Grid as primary viewport
- Shared tile semantics for builder and runtime
- Integer scaling lock
- Hard terrain with visual interpolation only on moving entities
- Canonical layer system
- Chamber-based run flow
- Phase 0 + core economy + conveyor logistics
- T1/T2 field systems and T3 mutator foundation
- Deterministic CPU scaffold
- Shadow runs and daily seeds

### Explicitly Out of Scope
- Full public map editor UX polish
- Full ghost/replay visualization comfort layer
- Full CPU behavior library beyond MVP scaffold
- Theme/biome swap system
- Auto-tiling comfort features beyond truth-safe baseline

---

## Canonical Locks (Index)
1. Pixel graphics are integer-scaled only.
2. Terrain, topology, and collision remain grid-hard.
3. Units, items, and projectiles may be visually interpolated.
4. Builder and runtime share one tile semantics vocabulary.
5. World construction uses fixed layers.
6. UI is world-centered; reports remain secondary.
7. Functional tiles must remain grayscale-readable.
8. Height is additionally encoded by form/edge/brightness.
9. Map is the primary object, not status panels.
10. Presentation may expose sim truth, never define it.
11. Editor, runtime, tests, and docs must use the same object terms.
12. Standard unit speed is `12 ticks per tile`.
13. Conveyor normal speed is `6 ticks per tile`.
14. Conveyor fast speed is `4 ticks per tile`.
15. Auto-tiling may derive visuals, never gameplay truth.
16. Debug is secondary in normal mode and full in inspect mode.

---

## Open Decisions (Reduced, Real)
1. Final stone extraction model (field, deposits, hybrid).
2. Exact mutator cost profile (workers/resources/energy split).
3. Exact splitter cost profile.
4. Fertilization economics (resource, time, or hybrid).
5. Accelerator strength formula.
6. Core input priority finalization (FIFO confirmation).
7. Idle building reorientation finalization.
8. Canonical run-hash state inclusion set.
9. Canonical replay input form (tick-exact vs order-queue).
10. Exact information boundaries for ghosts under T3/fog/visibility constraints.
11. Exact upper bound for topology auto-tiling before readability loss.
12. CPU behavior split: which parts are pre-MVP canonized vs post-MVP.

---

## Terminology Hygiene Note
Avoid overclaiming with "cryptographically provable" unless the implementation satisfies that threshold.
Preferred wording in this product contract:
- hash-verifiable
- deterministically verifiable
- auditable
- reproducible
- manipulation-hardened

## Migration Note
Current codebase may still contain legacy runtime traces.
Deletion remains replacement-driven:
- delete only dead after replacement
