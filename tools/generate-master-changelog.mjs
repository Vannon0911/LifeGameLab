import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

const root = process.cwd();
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const first = sh("git rev-list --max-parents=0 HEAD").split(/\r?\n/)[0].trim();
const lines = sh("git rev-list --reverse HEAD").split(/\r?\n/).filter(Boolean);

const out = [];
out.push("# MASTER_CHANGE_LOG");
out.push("");
out.push("Reproduzierbar generierter Commit-Changelog (Source of Truth: Git-Historie).");
out.push(`Release-Version: v${String(pkg.version || "")}`);
out.push("Policy: append-only.");
out.push("");
out.push("## Reproduzierbarkeit");
out.push("- Generator: `node tools/generate-master-changelog.mjs`");
out.push(`- Basis (v1-Fallback): \`${first}\``);
out.push(`- Commit-Anzahl: ${lines.length}`);
out.push("- Reihenfolge: `git rev-list --reverse HEAD`");
out.push("");
out.push("## Commit-Ledger Seit v1");
out.push("");

for (const hash of lines) {
  const meta = sh(`git show -s --format=%H%n%h%n%ad%n%an%n%s --date=short ${hash}`).split(/\r?\n/);
  const full = meta[0] || hash;
  const short = meta[1] || hash.slice(0, 7);
  const date = meta[2] || "unknown-date";
  const author = meta[3] || "unknown-author";
  const subject = meta.slice(4).join("\n").trim() || "(no subject)";

  const statRaw = sh(`git show --numstat --format= ${hash}`)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.split("\t"));

  let add = 0;
  let del = 0;
  const files = [];
  for (const row of statRaw) {
    const a = Number(row[0]);
    const d = Number(row[1]);
    const f = row[2] || "";
    if (Number.isFinite(a)) add += a;
    if (Number.isFinite(d)) del += d;
    if (f) files.push(f.replace(/\\/g, "/"));
  }

  out.push(`### ${date} ${short}`);
  out.push(`- hash: \`${full}\``);
  out.push(`- author: ${author}`);
  out.push(`- subject: ${subject}`);
  out.push(`- diffstat: +${add} / -${del} / files ${files.length}`);
  out.push(`- files:`);
  if (files.length === 0) {
    out.push("  - (keine Dateiaenderung erkannt)");
  } else {
    for (const f of files) out.push(`  - \`${f}\``);
  }
  out.push("");
}

const target = path.join(root, "docs", "MASTER_CHANGE_LOG.md");
writeFileSync(target, `${out.join("\n")}\n`, "utf8");
console.log(`MASTER_CHANGE_LOG_WRITTEN commits=${lines.length} first=${first}`);
