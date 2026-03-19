import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { dataflow } from "../src/project/contract/dataflow.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const uiSourcePath = path.join(root, "src", "game", "ui", "ui.js");
const uiSource = fs.readFileSync(uiSourcePath, "utf8");

const dispatchSources = dataflow.actions?.SET_MAPSPEC?.dispatchSources || [];
assert(dispatchSources.length > 0, "SET_MAPSPEC must expose at least one dispatch source");
assert(
  dispatchSources.includes("src/game/ui/ui.js"),
  "SET_MAPSPEC dispatch source must include src/game/ui/ui.js",
);
assert(
  uiSource.includes('type: "SET_MAPSPEC"'),
  "ui.js must dispatch SET_MAPSPEC so dataflow dispatch source stays truthful",
);

console.log(`MAPSPEC_DISPATCH_SOURCES_OK count=${dispatchSources.length}`);
