import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const currentTruthPath = path.join(root, "output", "current-truth.json");

function parseArgs(argv) {
  const args = { out: "output/truth-anchors.json" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--out" && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const truth = JSON.parse(fs.readFileSync(currentTruthPath, "utf8"));
  const manifestPath = path.join(root, String(truth.manifestPath || ""));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const claims = (manifest.claims || []).map((claim) => ({
    claimId: claim.claimId,
    attempts: (claim.attempts || []).map((attempt) => ({
      attempt: attempt.attempt,
      truthAnchor: attempt.truthAnchor || null,
    })),
  }));
  const payload = {
    commitSha: String(truth.commitSha || "unknown"),
    suite: String(truth.suite || ""),
    runId: String(truth.runId || ""),
    claimStatus: manifest.claimStatus,
    anchors: claims,
  };
  const outPath = path.join(root, args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`TRUTH_ANCHORS_EXPORTED ${path.relative(root, outPath).split(path.sep).join("/")}`);
}

main();
