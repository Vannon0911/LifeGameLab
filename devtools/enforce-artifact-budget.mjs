import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const EVIDENCE_ROOT = path.join(root, "output", "evidence");
const PACKED_ROOT = path.join(EVIDENCE_ROOT, "packed");
const ACTIVE_LIMIT = 10;
const PACK_BATCH_SIZE = 20;
const HARD_LIMIT = 50;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listEvidenceRunDirs() {
  if (!fs.existsSync(EVIDENCE_ROOT)) return [];
  const entries = fs.readdirSync(EVIDENCE_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => entry.name !== "packed")
    .map((entry) => {
      const full = path.join(EVIDENCE_ROOT, entry.name);
      const stats = fs.statSync(full);
      return { name: entry.name, full, mtimeMs: stats.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function moveToPackedBatches(items) {
  if (!items.length) return 0;
  ensureDir(PACKED_ROOT);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const groups = chunk(items, PACK_BATCH_SIZE);
  let moved = 0;
  groups.forEach((group, index) => {
    const batchDir = path.join(PACKED_ROOT, `${stamp}-batch-${String(index + 1).padStart(2, "0")}`);
    ensureDir(batchDir);
    group.forEach((item) => {
      const target = path.join(batchDir, item.name);
      fs.renameSync(item.full, target);
      moved += 1;
    });
  });
  return moved;
}

function main() {
  const runs = listEvidenceRunDirs();
  const total = runs.length;

  if (total > HARD_LIMIT) {
    console.error(
      `[artifact-budget] BLOCKED total=${total} hardLimit=${HARD_LIMIT}. Reduce artifacts first.`,
    );
    process.exit(1);
  }

  if (total <= ACTIVE_LIMIT) {
    console.log(`[artifact-budget] OK total=${total} activeLimit=${ACTIVE_LIMIT}`);
    return;
  }

  const overflow = runs.slice(ACTIVE_LIMIT);
  const moved = moveToPackedBatches(overflow);
  const remaining = listEvidenceRunDirs().length;
  console.log(
    `[artifact-budget] PACKED moved=${moved} batchSize=${PACK_BATCH_SIZE} activeNow=${remaining} activeLimit=${ACTIVE_LIMIT} hardLimit=${HARD_LIMIT}`,
  );
}

main();
