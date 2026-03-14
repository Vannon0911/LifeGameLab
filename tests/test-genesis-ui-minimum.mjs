import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-genesis-ui-minimum.mjs");

import fs from "node:fs";
import { getInfluencePhase } from "../src/game/ui/ui.model.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(getInfluencePhase(1, 0, "genesis_setup") === "Gruenden", "genesis influence phase must be Gruenden");
assert(getInfluencePhase(4, 0.30, "run_active") === "Kommandieren", "run_active influence phase regression");

const uiSource = fs.readFileSync(new URL("../src/game/ui/ui.js", import.meta.url), "utf8");
assert(uiSource.includes("Gründung bestätigen"), "genesis confirm button label missing in ui");
assert(uiSource.includes("sim.founderPlaced"), "genesis founder counter missing in ui");
assert(uiSource.includes("BRUSH_MODE.FOUNDER_PLACE"), "founder brush handling missing in ui");
assert(uiSource.includes("Genesis-Setup aktiv"), "play genesis hint missing in ui");

console.log("GENESIS_UI_MINIMUM_OK influence phase and genesis ui hooks verified");
