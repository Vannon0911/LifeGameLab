# STATUS — Current Head

## Snapshot (2026-03-18)
- Founder-Setup ist auf genau `1/1` gestellt (`sim.founderBudget = 1`).
- `renderAlpha`-Interpolation ist im Renderpfad aktiv.
- Ressourcenmarker aus `world.R` werden im Grid gerendert.
- Command-Chain `Select -> Move -> Arrive -> Harvest` ist aktiv (`ISSUE_ORDER`, 1 Tile pro Tick, Auto-Harvest).
- Pattern-Objekt-Symbol wird bei `triangle/loop` sichtbar auf Zone gerendert.
- Tick-Determinismus-Gates laufen gruen.

## Verifizierter Ist-Stand
- Sim-Runtime-Flag im aktuellen Head: `SIM_RUNTIME_DISABLED = false` in `src/app/main.js`.
- Tick-Loop: `dt = Math.max(0, ts - lastTs)` und `while (acc >= stepMs)`.
- Foundation-Eligibility verlangt exakt `founderBudget === 1` und `founderPlaced === 1`.
- UI-Input dispatcht `ISSUE_ORDER` ueber Canvas-`mousedown`.

## Gates / Nachweise (aktuell gruen)
- `node tools/run-all-tests.mjs --full`
- `node tests/test-deterministic-genesis.mjs`
- `node tests/test-step-chain-determinism.mjs`
- `node tests/test-readmodel-determinism.mjs`
- `node tests/test-kernel-replay-truth.mjs`

## Block-Nachweise (Null -> Vier)
- Block Null: `docs/PRODUCT.md` auf 1-Zellen-Konzept synchronisiert. Commit `7668c57`.
- Block Eins: `renderAlpha` + Zell-Interpolation. Nachweis: `output/playwright/block1-render-alpha/render_alpha_interpolation_headed.png`. Commit `6487ab3`.
- Block Zwei: Ressourcenmarker aus `world.R`. Nachweis: `output/playwright/block2-resource-layer/resource_markers_and_cell_headed.png`. Commit `75ecaf4`.
- Block Drei: `ISSUE_ORDER`-Kette mit Tick-Move/Auto-Harvest. Nachweis: `output/playwright/block3-order-flow/order_flow_headed.png` + `output/playwright/block3-order-flow/order_flow_log.json` (inkl. Hash-Anker, `HARVEST_AUTO`). Commits `0812116`, `a01392a`.
- Block Vier: Pattern-Objekt-Symbol bei `triangle/loop`. Nachweis: `output/playwright/block4-pattern-object/pattern_object_marker_headed.png` + `output/playwright/block4-pattern-object/pattern_object_marker_log.json`. Commit `b7fc4e3`.

## Naechste Session Startpaket
1. Einstieg: `docs/llm/ENTRY.md` -> `docs/WORKFLOW.md` -> diese `docs/STATUS.md`.
2. Scope fuer die naechste Arbeit: `ui+sim+versioning` (nur falls Pfade wirklich betroffen sind).
3. Preflight vor Schreiben:
   - `node tools/llm-preflight.mjs classify --paths <task-pfade>`
   - `node tools/llm-preflight.mjs entry --paths <task-pfade> --mode work`
   - `node tools/llm-preflight.mjs ack --paths <task-pfade>`
   - `node tools/llm-preflight.mjs check --paths <task-pfade>`
4. Startpunkt im Code:
   - `src/app/main.js` (Sim-Flag, Tick-Loop, Renderpfad)
   - `src/game/ui/ui.js` (neutraler Adapter)
   - `src/game/ui/ui.panels.js` / `src/game/ui/ui.feedback.js` (neutrale Verdrahtungs-Stubs)
5. Offener Arbeitsrest fuer den naechsten Block:
   - Pattern/Zone-Objektregeln aus `cellPatternCounts` auf echte Zonen-Topologien feiner ziehen.
   - Sichtbaren Marker von Einzel-Symbol auf produktnahe Objekt-Reaktion erweitern.
   - Command-Chain-UX (Selection-Feedback/Order-Feedback) rein visuell nachziehen.
