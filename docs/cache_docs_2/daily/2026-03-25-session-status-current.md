# Session Status Current (2026-03-25)

## Scope Freeze (User-decided)
- Phase 0 exists and lasts 10 seconds.
- 24 ticks = 1 second (hard frozen rule).
- Default map test size is 96x96.
- Tutorial is OFF.
- Inspect mode is CUT.
- UI target is minimalist, upgradeable, 2D isometric, retro tiles (no 3D).
- Delete rule A active: remove everything that does not directly support Builder, Movement, and the first 30-second core loop.
- Legacy wrappers are not allowed as carry-over.

## Terminology Freeze (to remove confusion)
- Old term `Energy` is renamed to `Nahrung` in the new design language.
- Core conversion rule: resources are converted to `Nahrung` in the main building.
- Worker cost rule: 1 worker costs 5 Nahrung.
- Long-term target economy direction: SCC2-style mineral economy.

## Current Verified Technical Constraints
- Store pipeline guards must remain fail-closed (schema validation, mutation matrix gate, determinism guard, patch gate).
- Builder mutations must remain phase-gated.
- Simulation stepping must remain runtime-gated and reducer-gated.

## Current Repo State
- Local modified file exists: `src/app/main.js` (pre-existing change, untouched in this step).
- New cache docs exist and are untracked.

## Next Allowed Write Block (user-approved after status update)
1. Docs/SoT wording sync for frozen decisions (Phase0=10s, Inspect cut, 96x96 default, terminology rename Energy->Nahrung).
2. Test/traceability alignment for the same frozen decisions.
3. No risky runtime removal in the first write block.
