import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonical(value[key]);
  return out;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    throw new Error("Usage: node tools/verify-cross-platform-truth.mjs <fileA> <fileB> [fileC...]");
  }
  const docs = args.map((rel) => {
    const abs = path.resolve(root, rel);
    const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
    return {
      rel,
      suite: raw.suite,
      claimStatus: raw.claimStatus,
      anchors: raw.anchors,
    };
  });
  const baseline = JSON.stringify(canonical(docs[0]));
  for (let i = 1; i < docs.length; i += 1) {
    const current = JSON.stringify(canonical(docs[i]));
    if (current !== baseline) {
      throw new Error(`Cross-platform truth mismatch between '${docs[0].rel}' and '${docs[i].rel}'`);
    }
  }
  console.log(`CROSS_PLATFORM_TRUTH_OK files=${args.join(",")}`);
}

main();
