import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-main-runtime-callers.mjs");

import fs from "node:fs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const mainSource = fs.readFileSync(new URL("../src/app/main.js", import.meta.url), "utf8");

assert(mainSource.includes('store.dispatch({ type: "GEN_WORLD" });'), "bootstrap must stay on plain GEN_WORLD");
assert(
  mainSource.includes('store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });'),
  "main runtime must keep explicit LAB_AUTORUN callers for lab paths",
);
assert(
  mainSource.includes('store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });'),
  "lab runtime callers must still re-enable running explicitly",
);
assert(mainSource.includes("async run(store) {"), "benchmark runner missing");
assert(mainSource.includes("function recoverWorld(reason) {"), "recoverWorld missing");

console.log("MAIN_RUNTIME_CALLERS_OK bootstrap stays genesis and lab callers stay explicit");
