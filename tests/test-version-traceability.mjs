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

const majorVersion = Number(String(APP_VERSION).split(".")[0]);
if (!Number.isFinite(majorVersion) || majorVersion !== SCHEMA_VERSION) {
  fail(`APP_VERSION major ${majorVersion} must match SCHEMA_VERSION ${SCHEMA_VERSION}`);
}

if (packageJson.scripts?.test !== "node tools/run-all-tests.mjs") {
  fail("package.json scripts.test must point to tools/run-all-tests.mjs");
}

if (packageJson.scripts?.["test:full"] !== "node tools/run-all-tests.mjs") {
  fail("package.json scripts.test:full must point to tools/run-all-tests.mjs");
}

assertContains("README.md", `# LifexLab v${APP_VERSION}`, "README version heading");
assertContains("index.html", `<title>LifexLab v${APP_VERSION}</title>`, "index title version");
assertContains("index.html", `LifexLab v${APP_VERSION} —`, "index description version");
assertContains("docs/BUGFIX_LOG.md", `# BUGFIX LOG — v${APP_VERSION}`, "BUGFIX_LOG version header");
assertContains("docs/MASTER_CHANGE_LOG.md", `v${APP_VERSION}`, "MASTER_CHANGE_LOG release version");
assertContains("docs/MASTER_CHANGE_LOG.md", "append-only", "MASTER_CHANGE_LOG append-only policy");
assertContains("docs/PROJECT_CONTRACT_SNAPSHOT.md", `APP_VERSION:** ${APP_VERSION}`, "contract snapshot APP_VERSION");

console.log(`VERSION_TRACEABILITY_OK ${APP_VERSION} schema=${SCHEMA_VERSION}`);
