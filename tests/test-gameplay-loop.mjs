/**
     * test-gameplay-loop.mjs
     * End-to-end proof that the core gameplay loop works.
     */
    import { createStore } from "../src/core/kernel/store.js";
    import * as manifest from "../src/project/project.manifest.js";
    import { reducer, simStepPatch } from "../src/project/project.logic.js";

    function assert(cond, msg) {
      if (!cond) throw new Error(msg);
    }

    function mkStore(seed = "gameplay-1") {
      const store = createStore(manifest, { reducer, simStep: simStepPatch });
      store.dispatch({ type: "SET_SEED", payload: seed });
      store.dispatch({ type: "GEN_WORLD" });
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

    let pass = 0;
    const total = 4;

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

    // TEST 3: BUY_EVOLUTION consumes DNA and mutates player cells
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
      const dnaCost = 5 * (Number(s.sim.playerStage) || 1);
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

      assert(s.sim.playerDNA < dnaAfterHarvest, `DNA did not decrease: ${dnaAfterHarvest} -> ${s.sim.playerDNA}`);
      const traitChanged = traitAfter.some((v, i) => Math.abs(v - traitBefore[i]) > 1e-6);
      assert(traitChanged, "Player traits did not change after BUY_EVOLUTION");
      assert(Math.abs(hueAfter - hueBefore) > 1e-6, "Hue did not change after BUY_EVOLUTION");
      console.log(`  BUY_EVOLUTION: dna ${dnaAfterHarvest.toFixed(2)} -> ${s.sim.playerDNA.toFixed(2)}, traitChanged=${traitChanged}`);
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

    console.log(`
GAMEPLAY_LOOP_OK ${pass}/${total} -- harvest, guards, evolution, zones verified`);
    if (pass < total) process.exit(1);
