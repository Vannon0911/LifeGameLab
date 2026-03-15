import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-version-traceability.mjs");
import fs from "node:fs";
import path from "node:path";
import { APP_VERSION, SCHEMA_VERSION } from "../src/project/project.manifest.js";

function fail(msg) {
  console.error(`VERSION_TRACEABILITY_FAIL: ${msg}`);
  process.exit(1);
}

function read(relPath) {
  return fs.readFileSync(path.resolve(relPath), "utf8");
}

function assertContains(relPath, needle, label = needle) {
  const text = read(relPath);
  if (!text.includes(needle)) fail(`${relPath} missing ${label}`);
}

const packageJson = JSON.parse(read("package.json"));
if (packageJson.version !== APP_VERSION) {
  fail(`package.json version ${packageJson.version} does not match APP_VERSION ${APP_VERSION}`);
}

if (!/^\d+\.\d+\.\d+$/.test(String(APP_VERSION))) {
  fail(`APP_VERSION ${APP_VERSION} must be SemVer-like (x.y.z)`);
}

if (!Number.isInteger(SCHEMA_VERSION) || SCHEMA_VERSION < 1) {
  fail(`SCHEMA_VERSION ${SCHEMA_VERSION} must be a positive integer`);
}

if (packageJson.scripts?.test !== "node tools/run-all-tests.mjs") {
  fail("package.json scripts.test must point to tools/run-all-tests.mjs");
}

if (packageJson.scripts?.["test:full"] !== "node tools/run-all-tests.mjs") {
  fail("package.json scripts.test:full must point to tools/run-all-tests.mjs");
}

assertContains("README.md", `# LifeGameLab v${APP_VERSION}`, "README version heading");
assertContains("index.html", `<title>LifeGameLab v${APP_VERSION}</title>`, "index title version");
assertContains("index.html", `LifeGameLab v${APP_VERSION} —`, "index description version");
assertContains("docs/STATUS.md", `# STATUS — v${APP_VERSION}`, "STATUS version header");
assertContains("docs/STATUS.md", "append-only", "STATUS append-only policy");
assertContains("docs/ARCHITECTURE.md", `APP_VERSION:** ${APP_VERSION}`, "architecture APP_VERSION");

console.log(`VERSION_TRACEABILITY_OK ${APP_VERSION} schema=${SCHEMA_VERSION}`);
