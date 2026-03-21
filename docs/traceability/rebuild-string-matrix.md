# Rebuild String Matrix

Derived from product and contract SoT.
This file is a migration map, not canonical truth.

## Action Strings (Legacy / Compatibility)
| Current string | Type | Target status | Replacement | Removal condition |
| --- | --- | --- | --- | --- |
| `GEN_WORLD` | action | keep | `GEN_WORLD` | none |
| `CONFIRM_FOUNDATION` | action | deprecated | `PLACE_CORE` | no dispatch, no reducer, tests migrated, replacement wired |
| `CONFIRM_CORE_ZONE` | action | deprecated | `PLACE_CORE` | no dispatch, no reducer, tests migrated, replacement wired |
| `TOGGLE_DNA_ZONE_WORKER` | action | rename | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated, replacement wired |
| `BUILD_INFRA_PATH` | action | rename | `PLACE_LINE_SEGMENT` | no dispatch, no reducer, tests migrated, replacement wired |
| `PLACE_WORKER` | action | keep | `PLACE_WORKER` | none |
| `PLACE_SPLIT_CLUSTER` | action | rename | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated, replacement wired |
| `HARVEST_WORKER` | action | rename | `QUEUE_WORKER` | no dispatch, no reducer, tests migrated, replacement wired |
| `SET_ZONE` | action | rename | `PLACE_BUILDING` | no dispatch, no reducer, tests migrated, replacement wired |
| `SET_BRUSH` | action | deprecated | `SELECT_ENTITY` | no dispatch, no reducer, tests migrated, replacement wired |

## New RTS Strings
| Current string | Type | Target status | Replacement | Removal condition |
| --- | --- | --- | --- | --- |
| `SET_MAPSPEC` | action | keep | `SET_MAPSPEC` | none |
| `SET_MAP_TILE` | action | keep | `SET_MAP_TILE` | none |
| `SELECT_ENTITY` | action | keep | `SELECT_ENTITY` | none |
| `ISSUE_MOVE` | action | keep | `ISSUE_MOVE` | none |
| `PLACE_CORE` | action | keep | `PLACE_CORE` | none |
| `PLACE_WORKER` | action | keep | `PLACE_WORKER` | none |
| `PLACE_BUILDING` | action | keep | `PLACE_BUILDING` | none |
| `PLACE_BELT_SEGMENT` | action | keep | `PLACE_BELT_SEGMENT` | none |
| `PLACE_LINE_SEGMENT` | action | keep | `PLACE_LINE_SEGMENT` | none |
| `SET_CORE_ROUTING` | action | keep | `SET_CORE_ROUTING` | none |
| `QUEUE_WORKER` | action | keep | `QUEUE_WORKER` | none |
| `SPAWN_FIGHTER` | action | keep | `SPAWN_FIGHTER` | none |
| `ASSIGN_REPAIR` | action | keep | `ASSIGN_REPAIR` | none |
| `SET_MUTATOR_PATTERN` | action | keep | `SET_MUTATOR_PATTERN` | none |
| `COMMIT_MUTATION` | action | keep | `COMMIT_MUTATION` | none |

## Builder / Editor Strings
| Current string | Type | Target status | Replacement | Removal condition |
| --- | --- | --- | --- | --- |
| `SET_SURFACE_TILE` | action | keep | `SET_SURFACE_TILE` | none |
| `SET_RESOURCE_TILE` | action | keep | `SET_RESOURCE_TILE` | none |
| `ERASE_TILE_CONTENT` | action | keep | `ERASE_TILE_CONTENT` | none |
| `BUILDER_UNDO` | action | keep | `BUILDER_UNDO` | none |
| `BUILDER_REDO` | action | keep | `BUILDER_REDO` | none |
| `SET_BUILDER_BRUSH_SIZE` | action | keep | `SET_BUILDER_BRUSH_SIZE` | none |
| `GENERATE_MAP_SEED` | action | keep | `GENERATE_MAP_SEED` | none |

## Product Terms
| Current string | Type | Target status | Replacement | Removal condition |
| --- | --- | --- | --- | --- |
| `founder` | doc term | split | `phase0_worker` or `phase0_foundation` | new flow live |
| `cell` | doc term | rename | `worker` | worker runtime wording fully synced |
| `dnaZone` | doc term | drop | `building footprint` | replacement wired |
| `coreZone` | doc term | drop | `core` | replacement wired |
| `infraBuild` | doc term | drop | `belt`, `line`, `routing` | replacement wired |
| `lineage` | doc term | drop in product language | none or algorithm-only | neutral extraction complete |
| `doctrine` | doc term | drop in product language | mutator pattern or topology | replacement wired |
| `biocharge` | doc term | drop in product language | none | replacement wired |
| `cluster` | doc term | drop in product language | topology, logistics or formation | replacement wired |
| `evolution` | doc term | drop in product language | mutation | replacement wired |
| `preset` | doc term | rename | `MapSpec` | replacement wired |
