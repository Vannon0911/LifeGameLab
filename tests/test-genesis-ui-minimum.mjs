import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-genesis-ui-minimum.mjs");

import fs from "node:fs";
import { getInfluencePhase } from "../src/game/ui/ui.model.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(getInfluencePhase(1, 0, "genesis_setup") === "Gruenden", "genesis influence phase must be Gruenden");
assert(getInfluencePhase(1, 0, "genesis_zone") === "Energiekern", "genesis zone influence phase must be Energiekern");
assert(getInfluencePhase(1, 0, "dna_zone_setup") === "DNA-Zone", "dna zone setup influence phase must be DNA-Zone");
assert(getInfluencePhase(4, 0.30, "run_active") === "Kommandieren", "run_active influence phase regression");

const uiShellSource = fs.readFileSync(new URL("../src/game/ui/ui.js", import.meta.url), "utf8");
const lageSource = fs.readFileSync(new URL("../src/game/ui/ui.lage.js", import.meta.url), "utf8");
const eingriffeSource = fs.readFileSync(new URL("../src/game/ui/ui.eingriffe.js", import.meta.url), "utf8");
const uiSource = `${uiShellSource}\n${lageSource}\n${eingriffeSource}`;

assert(uiSource.includes("Gruendung bestaetigen"), "genesis confirm button label missing in ui");
assert(uiSource.includes("sim.founderPlaced"), "genesis founder counter missing in ui");
assert(uiShellSource.includes("BRUSH_MODE.FOUNDER_PLACE"), "founder brush handling missing in ui");
assert(uiSource.includes("Genesis-Setup aktiv"), "play genesis hint missing in ui");
assert(uiShellSource.includes("Genesis-Zone aktiv: erst Energiekern bestaetigen."), "genesis zone play hint missing in ui");
assert(uiShellSource.includes("Step ist in der Genesis-Zone gesperrt."), "genesis zone step hint missing in ui");
assert(uiSource.includes("Energiekern bestaetigen"), "core confirm button label missing in ui");
assert(uiSource.includes("Zone 2: DNA"), "dna unlock card missing in ui");
assert(uiSource.includes("DNA-Zone starten"), "dna zone start button missing in ui");
assert(uiSource.includes("DNA-Zone setzen"), "dna zone setup card missing in ui");
assert(uiSource.includes("DNA-Zone bestaetigen"), "dna zone confirm button missing in ui");
assert(uiShellSource.includes("Step ist im DNA-Zone-Setup gesperrt."), "dna zone setup step hint missing in ui");
assert(uiShellSource.includes("TOGGLE_DNA_ZONE_CELL"), "dna zone cell dispatch missing in ui");
assert(uiSource.includes("Zone 2 aktiv"), "dna zone committed card missing in ui");
assert(uiSource.includes("Naechster Unlock"), "next infra unlock text missing in ui");
assert(uiSource.includes("sim.zoneUnlockProgress"), "dna unlock progress binding missing in ui");
assert(uiSource.includes("sim.coreEnergyStableTicks"), "core stable ticks binding missing in ui");
assert(uiSource.includes("Sicht & Kartenwissen"), "visibility status card missing in lage panel");
assert(uiSource.includes("Zonen & Muster"), "zone/pattern summary missing in lage panel");
assert(uiSource.includes("zoneRole"), "zoneRole display hook missing in lage panel");
assert(uiSource.includes("patternCatalog"), "patternCatalog display hook missing in lage panel");
assert(uiSource.includes("Infrastruktur starten"), "infra start button missing in ui");
assert(uiSource.includes("Infrastruktur bestaetigen"), "infra confirm button missing in ui");
assert(uiShellSource.includes("Leerer Staging-Pfad hat nichts committed."), "empty infra confirm abort copy missing in ui shell");
assert(uiShellSource.includes('type: "BEGIN_INFRA_BUILD"'), "infra start dispatch missing in ui shell");
assert(uiShellSource.includes('type: "BUILD_INFRA_PATH"'), "infra path dispatch missing in ui shell");
assert(uiShellSource.includes('type: "CONFIRM_INFRA_PATH"'), "infra confirm dispatch missing in ui shell");
assert(uiSource.includes("Sicht-Legende"), "world fog legend missing in ui");
assert(uiSource.includes("infraBuildMode"), "infra build mode ui handling missing");

console.log("GENESIS_UI_MINIMUM_OK influence phase and genesis ui hooks verified");
