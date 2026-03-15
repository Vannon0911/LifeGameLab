import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-gameplay-loop.mjs");
/**
     * test-gameplay-loop.mjs
     * End-to-end proof that the core gameplay loop works.
     */
    import { createStore } from "../src/core/kernel/store.js";
    import * as manifest from "../src/project/project.manifest.js";
    import { reducer, simStepPatch } from "../src/project/project.logic.js";
    import { GAME_MODE } from "../src/game/contracts/ids.js";
    import { deriveCommandScore } from "../src/game/techTree.js";
    import { patchClusterRunRequirements } from "./support/phaseFTestUtils.mjs";

    function assert(cond, msg) {
      if (!cond) throw new Error(msg);
    }

    function mkStore(seed = "gameplay-1") {
      const store = createStore(manifest, { reducer, simStep: simStepPatch });
      store.dispatch({ type: "SET_SEED", payload: seed });
      store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
      store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
      return store;
    }

    function findCell(state, lineageId) {
      for (let i = 0; i < state.world.alive.length; i++) {
        if (state.world.alive[i] === 1 && (Number(state.world.lineageId[i]) | 0) === lineageId) {
          return { idx: i, x: i % state.world.w, y: Math.floor(i / state.world.w) };
        }
      }
      return null;
    }

    function firstPlayerCells(state, count) {
      const out = [];
      const pLid = state.meta.playerLineageId;
      for (let i = 0; i < state.world.alive.length && out.length < count; i++) {
        if (state.world.alive[i] === 1 && (Number(state.world.lineageId[i]) | 0) === pLid) {
          out.push({ idx: i, x: i % state.world.w, y: Math.floor(i / state.world.w) });
        }
      }
      return out;
    }

    function findIsolatedEmpty(state) {
      const { w, h, alive } = state.world;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          if (alive[idx] === 1) continue;
          let neighbors = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const j = (y + dy) * w + (x + dx);
              if (alive[j] === 1) neighbors++;
            }
          }
          if (neighbors === 0) return { idx, x, y };
        }
      }
      return null;
    }

    function findEmptyClusterOrigin(state, size = 4) {
      const { w, h, alive } = state.world;
      for (let y = 0; y <= h - size; y++) {
        for (let x = 0; x <= w - size; x++) {
          let clear = true;
          for (let yy = y; yy < y + size && clear; yy++) {
            for (let xx = x; xx < x + size; xx++) {
              if (alive[yy * w + xx] === 1) {
                clear = false;
                break;
              }
            }
          }
          if (clear) return { x, y };
        }
      }
      return null;
    }

    function earnDNA(store, minimum) {
      let state = store.getState();
      let guard = 0;
      while (Number(state.sim.playerDNA || 0) < minimum && guard < 24) {
        const targets = firstPlayerCells(state, 1);
        if (!targets.length) break;
        store.dispatch({ type: "HARVEST_CELL", payload: { x: targets[0].x, y: targets[0].y } });
        state = store.getState();
        guard++;
      }
      return state;
    }

    function stepFor(store, ticks) {
      for (let i = 0; i < ticks; i++) store.dispatch({ type: "SIM_STEP", payload: { force: true } });
      return store.getState();
    }

    let pass = 0;
    const total = 7;

    // TEST 1: HARVEST_CELL gives DNA
    try {
      const store = mkStore("harvest-dna");
      for (let i = 0; i < 60; i++) store.dispatch({ type: "SIM_STEP", payload: { force: true } });
      let s = store.getState();
      const cell = findCell(s, s.meta.playerLineageId);
      assert(cell, "No player cells found after 60 ticks");
      const dnaBefore = s.sim.playerDNA;
      store.dispatch({ type: "HARVEST_CELL", payload: { x: cell.x, y: cell.y } });
      s = store.getState();
      assert(s.sim.playerDNA > dnaBefore, `DNA did not increase: ${dnaBefore} -> ${s.sim.playerDNA}`);
      assert(s.sim.totalHarvested > 0, "totalHarvested not updated");
      assert(s.world.alive[cell.idx] === 0, "Harvested cell still alive");
      console.log(`  HARVEST: DNA gained ${(s.sim.playerDNA - dnaBefore).toFixed(3)}, totalHarvested=${s.sim.totalHarvested}`);
      pass++;
    } catch (err) { console.error("TEST1 HARVEST FAIL:", err.message); }

    // TEST 2: HARVEST guard blocks CPU cells
    try {
      const store = mkStore("harvest-guard-cpu");
      for (let i = 0; i < 60; i++) store.dispatch({ type: "SIM_STEP", payload: { force: true } });
      let s = store.getState();
      const cpuCell = findCell(s, s.meta.cpuLineageId);
      assert(cpuCell, "No CPU cells found");
      const dnaBefore = s.sim.playerDNA;
      store.dispatch({ type: "HARVEST_CELL", payload: { x: cpuCell.x, y: cpuCell.y } });
      s = store.getState();
      assert(s.sim.playerDNA === dnaBefore, `CPU cell harvest gave DNA: ${dnaBefore} -> ${s.sim.playerDNA}`);
      assert(s.world.alive[cpuCell.idx] === 1, "CPU cell was incorrectly removed");
      console.log("  HARVEST guard: CPU cell correctly rejected");
      pass++;
    } catch (err) { console.error("TEST2 CPU-GUARD FAIL:", err.message); }

    // TEST 3: BUY_EVOLUTION consumes DNA, unlocks tech, and mutates player cells
    try {
      const store = mkStore("buy-evo");
      for (let i = 0; i < 80; i++) store.dispatch({ type: "SIM_STEP", payload: { force: true } });

      let s = store.getState();
      let harvested = 0;
      while (harvested < 12) {
        const targets = firstPlayerCells(s, 1);
        if (!targets.length) break;
        const cell = targets[0];
        store.dispatch({ type: "HARVEST_CELL", payload: { x: cell.x, y: cell.y } });
        harvested++;
        s = store.getState();
        const dnaCost = 5 * (Number(s.sim.playerStage) || 1);
        if (s.sim.playerDNA >= dnaCost) break;
      }
      const dnaAfterHarvest = s.sim.playerDNA;
      const dnaCost = 5;
      assert(dnaAfterHarvest >= dnaCost, `Not enough DNA for evolution: have ${dnaAfterHarvest}, need ${dnaCost}`);

      const remainingPlayer = findCell(s, s.meta.playerLineageId);
      assert(remainingPlayer, "No player cell left to inspect after harvest");
      const traitOffset = remainingPlayer.idx * 7;
      const traitBefore = Array.from(s.world.trait.slice(traitOffset, traitOffset + 7));
      const hueBefore = Number(s.world.hue[remainingPlayer.idx] || 0);

      store.dispatch({ type: "BUY_EVOLUTION", payload: { archetypeId: "light_harvest" } });
      s = store.getState();
      const traitAfter = Array.from(s.world.trait.slice(traitOffset, traitOffset + 7));
      const hueAfter = Number(s.world.hue[remainingPlayer.idx] || 0);
      const playerMemory = s.world.lineageMemory?.[s.meta.playerLineageId];

      assert(s.sim.playerDNA < dnaAfterHarvest, `DNA did not decrease: ${dnaAfterHarvest} -> ${s.sim.playerDNA}`);
      const traitChanged = traitAfter.some((v, i) => Math.abs(v - traitBefore[i]) > 1e-6);
      assert(traitChanged, "Player traits did not change after BUY_EVOLUTION");
      assert(Math.abs(hueAfter - hueBefore) > 1e-6, "Hue did not change after BUY_EVOLUTION");
      assert(Array.isArray(playerMemory?.techs) && playerMemory.techs.includes("light_harvest"), "Tech unlock missing in lineage memory");
      console.log(`  BUY_EVOLUTION: dna ${dnaAfterHarvest.toFixed(2)} -> ${s.sim.playerDNA.toFixed(2)}, traitChanged=${traitChanged}, tech=light_harvest`);
      pass++;
    } catch (err) { console.error("TEST3 BUY_EVOLUTION FAIL:", err.message); }

    // TEST 4: SET_ZONE writes to zoneMap
    try {
      const store = mkStore("zone-map");
      store.dispatch({ type: "SIM_STEP", payload: { force: true } });
      let s = store.getState();
      const cx = Math.floor(s.world.w / 2);
      const cy = Math.floor(s.world.h / 2);
      const idx = cy * s.world.w + cx;
      store.dispatch({ type: "SET_ZONE", payload: { x: cx, y: cy, radius: 2, zoneType: 1 } });
      s = store.getState();
      assert(s.world.zoneMap instanceof Int8Array, "zoneMap not Int8Array");
      assert(s.world.zoneMap[idx] === 1, `zoneMap[center]=${s.world.zoneMap[idx]}, expected 1`);
      let zoneCount = 0;
      for (let i = 0; i < s.world.zoneMap.length; i++) if (s.world.zoneMap[i] === 1) zoneCount++;
      assert(zoneCount >= 1, "No zone tiles set");
      console.log(`  SET_ZONE: ${zoneCount} tiles set to HARVEST around (${cx},${cy})`);
      pass++;
    } catch (err) { console.error("TEST4 SET_ZONE FAIL:", err.message); }

    // TEST 5: isolated cells die after one step
    try {
      const store = mkStore("solo-dies");
      let s = store.getState();
      const spot = findIsolatedEmpty(s);
      assert(spot, "No isolated empty tile found");
      store.dispatch({ type: "SET_PLACEMENT_COST", payload: { enabled: false } });
      store.dispatch({ type: "PLACE_CELL", payload: { x: spot.x, y: spot.y, remove: false } });
      s = store.getState();
      assert(s.world.alive[spot.idx] === 1, "Placed isolated cell did not spawn");
      store.dispatch({ type: "SIM_STEP", payload: { force: true } });
      s = store.getState();
      assert(s.world.alive[spot.idx] === 0, "Isolated cell survived without neighbours");
      console.log("  ISOLATION: single cell correctly dies without neighbours");
      pass++;
    } catch (err) { console.error("TEST5 ISOLATION FAIL:", err.message); }

    // TEST 6: split unlock via evolution places a 4x4 player cluster
    try {
      const store = mkStore("split-cluster");
      let s = stepFor(store, 60);
      let dnaCost = 5;
      s = earnDNA(store, dnaCost);
      s = earnDNA(store, dnaCost);
      assert(s.sim.playerDNA >= dnaCost, `Not enough DNA for light_harvest: ${s.sim.playerDNA} < ${dnaCost}`);
      store.dispatch({ type: "BUY_EVOLUTION", payload: { archetypeId: "light_harvest" } });
      s = store.getState();
      assert(Array.isArray(s.world.lineageMemory?.[s.meta.playerLineageId]?.techs) && s.world.lineageMemory[s.meta.playerLineageId].techs.includes("light_harvest"), "light_harvest did not unlock");

      let guard = 0;
      while (Number(s.sim.playerStage || 1) < 2 && guard < 64) {
        s = stepFor(store, 2);
        guard++;
      }
      assert(Number(s.sim.playerStage || 1) >= 2, `Player stage did not reach 2: ${s.sim.playerStage}`);

      guard = 0;
      while (Number(s.sim.playerDNA || 0) < 10 && guard < 32) {
        s = earnDNA(store, 10);
        if (Number(s.sim.playerDNA || 0) >= 10) break;
        s = stepFor(store, 2);
        guard++;
      }

      guard = 0;
      while (deriveCommandScore(s.sim) < 0.10 && guard < 80) {
        s = stepFor(store, 1);
        guard++;
      }
      s = patchClusterRunRequirements(store);
      dnaCost = 10;
      s = earnDNA(store, dnaCost);
      assert(s.sim.playerDNA >= dnaCost, `Not enough DNA for cooperative_network: ${s.sim.playerDNA} < ${dnaCost}`);
      store.dispatch({ type: "BUY_EVOLUTION", payload: { archetypeId: "cooperative_network" } });
      s = store.getState();
      assert(Array.isArray(s.world.lineageMemory?.[s.meta.playerLineageId]?.techs) && s.world.lineageMemory[s.meta.playerLineageId].techs.includes("cooperative_network"), "cooperative_network did not unlock");

      s = stepFor(store, 12);
      guard = 0;
      while (deriveCommandScore(s.sim) < 0.14 && guard < 80) {
        s = stepFor(store, 1);
        guard++;
      }
      s = patchClusterRunRequirements(store);
      guard = 0;
      dnaCost = 10;
      while (Number(s.sim.playerDNA || 0) < dnaCost && guard < 32) {
        s = earnDNA(store, dnaCost);
        if (Number(s.sim.playerDNA || 0) >= dnaCost) break;
        s = stepFor(store, 2);
        guard++;
      }
      assert(s.sim.playerDNA >= dnaCost, `Not enough DNA for split unlock: ${s.sim.playerDNA} < ${dnaCost}`);
      store.dispatch({ type: "BUY_EVOLUTION", payload: { archetypeId: "cluster_split" } });
      s = store.getState();
      const pLid = s.meta.playerLineageId;
      assert(Number(s.world.lineageMemory?.[pLid]?.splitUnlock || 0) === 1, "Split unlock missing in lineage memory");
      s = earnDNA(store, 8);
      assert(Number(s.sim.playerDNA || 0) >= 8, `Not enough DNA for paid split placement: ${s.sim.playerDNA} < 8`);
      const origin = findEmptyClusterOrigin(s, 4);
      assert(origin, "No empty 4x4 region found for split");
      store.dispatch({ type: "PLACE_SPLIT_CLUSTER", payload: { x: origin.x + 1, y: origin.y + 1 } });
      s = store.getState();
      let aliveCount = 0;
      for (let yy = origin.y; yy < origin.y + 4; yy++) {
        for (let xx = origin.x; xx < origin.x + 4; xx++) {
          const idx = yy * s.world.w + xx;
          assert(s.world.alive[idx] === 1, `Split tile (${xx},${yy}) not alive`);
          assert((Number(s.world.lineageId[idx]) | 0) === pLid, `Split tile (${xx},${yy}) not player-owned`);
          aliveCount++;
        }
      }
      console.log(`  SPLIT: ${aliveCount} player tiles placed as 4x4 cluster`);
      pass++;
    } catch (err) { console.error("TEST6 SPLIT FAIL:", err.message); }

    // TEST 7: doctrine switch persists in lineage memory
    try {
      const store = mkStore("doctrine-switch");
      let s = store.getState();
      store.dispatch({ type: "SET_PLAYER_DOCTRINE", payload: { doctrineId: "expansion" } });
      s = store.getState();
      const pLid = s.meta.playerLineageId;
      assert(String(s.world.lineageMemory?.[pLid]?.doctrine || "") === "expansion", "Doctrine not written to lineage memory");
      console.log("  DOCTRINE: player doctrine switched to expansion");
      pass++;
    } catch (err) { console.error("TEST7 DOCTRINE FAIL:", err.message); }

    console.log(`
GAMEPLAY_LOOP_OK ${pass}/${total} -- harvest, guards, evolution, zones, isolation, split, doctrine verified`);
    if (pass < total) process.exit(1);
