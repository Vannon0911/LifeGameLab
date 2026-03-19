# Rebuild String Matrix

Derived from product and contract SoT.
This file is a migration map, not canonical truth.

## Action Strings
| Current string | Type | Target status | Replacement | Removal condition |
| --- | --- | --- | --- | --- |
| `GEN_WORLD` | action | keep | `GEN_WORLD` | none |
| `SET_WORLD_PRESET` | action | rename | `SET_MAPSPEC` | replacement wired |
| `ISSUE_ORDER` | action | rename | `ISSUE_MOVE` | replacement wired |
| `SET_OVERLAY` | action | rename | `SET_UI` or remove | overlay policy fixed |
| `CONFIRM_FOUNDATION` | action | drop | `PLACE_CORE` | no dispatch, no reducer, tests migrated |
| `CONFIRM_CORE_ZONE` | action | drop | `PLACE_CORE` | no dispatch, no reducer, tests migrated |
| `START_DNA_ZONE_SETUP` | action | drop | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated |
| `TOGGLE_DNA_ZONE_CELL` | action | drop | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated |
| `CONFIRM_DNA_ZONE` | action | drop | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated |
| `BEGIN_INFRA_BUILD` | action | drop | `PLACE_LINE_SEGMENT` | no dispatch, no reducer, tests migrated |
| `BUILD_INFRA_PATH` | action | drop | `PLACE_LINE_SEGMENT` | no dispatch, no reducer, tests migrated |
| `CONFIRM_INFRA_PATH` | action | drop | `PLACE_LINE_SEGMENT` | no dispatch, no reducer, tests migrated |
| `PLACE_CELL` | action | drop | `PLACE_CORE` | no dispatch, no reducer, tests migrated |
| `PLACE_SPLIT_CLUSTER` | action | drop | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated |
| `HARVEST_CELL` | action | drop | `QUEUE_WORKER` | no dispatch, no reducer, tests migrated |
| `HARVEST_PULSE` | action | drop | `QUEUE_WORKER` | no dispatch, no reducer, tests migrated |
| `PRUNE_CLUSTER` | action | drop | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated |
| `RECYCLE_PATCH` | action | drop | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated |
| `SEED_SPREAD` | action | drop | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated |
| `SET_ZONE` | action | drop | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated |
| `BUY_EVOLUTION` | action | drop | `COMMIT_MUTATION` | no dispatch, no reducer, tests migrated |
| `SET_PLAYER_DOCTRINE` | action | drop | `SET_MUTATOR_PATTERN` | no dispatch, no reducer, tests migrated |
| `SET_PLACEMENT_COST` | action | drop | none | no dispatch, no reducer, tests migrated |

## New RTS Strings
| Current string | Type | Target status | Replacement | Removal condition |
| --- | --- | --- | --- | --- |
| `SET_MAPSPEC` | action | keep | `SET_MAPSPEC` | none |
| `SELECT_ENTITY` | action | keep | `SELECT_ENTITY` | none |
| `ISSUE_MOVE` | action | keep | `ISSUE_MOVE` | none |
| `PLACE_CORE` | action | keep | `PLACE_CORE` | none |
| `PLACE_BUILDING` | action | keep | `PLACE_BUILDING` | none |
| `PLACE_BELT_SEGMENT` | action | keep | `PLACE_BELT_SEGMENT` | none |
| `PLACE_LINE_SEGMENT` | action | keep | `PLACE_LINE_SEGMENT` | none |
| `SET_CORE_ROUTING` | action | keep | `SET_CORE_ROUTING` | none |
| `QUEUE_WORKER` | action | keep | `QUEUE_WORKER` | none |
| `SPAWN_FIGHTER` | action | keep | `SPAWN_FIGHTER` | none |
| `ASSIGN_REPAIR` | action | keep | `ASSIGN_REPAIR` | none |
| `SET_MUTATOR_PATTERN` | action | keep | `SET_MUTATOR_PATTERN` | none |
| `COMMIT_MUTATION` | action | keep | `COMMIT_MUTATION` | none |

## Product Terms
| Current string | Type | Target status | Replacement | Removal condition |
| --- | --- | --- | --- | --- |
| `founder` | doc term | split | `phase0_worker` or `phase0_foundation` | new flow live |
| `dnaZone` | doc term | drop | `building footprint` | replacement wired |
| `coreZone` | doc term | drop | `core` | replacement wired |
| `infraBuild` | doc term | drop | `belt`, `line`, `routing` | replacement wired |
| `lineage` | doc term | drop in product language | none or algorithm-only | neutral extraction complete |
| `doctrine` | doc term | drop in product language | mutator pattern or topology | replacement wired |
| `biocharge` | doc term | drop in product language | none | replacement wired |
| `cluster` | doc term | drop in product language | topology, logistics or formation | replacement wired |
| `evolution` | doc term | drop in product language | mutation | replacement wired |
| `preset` | doc term | rename | `MapSpec` | replacement wired |
