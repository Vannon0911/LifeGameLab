import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const CANONICAL_TAG = "backup-main-pre-rewrite-anchor";
const BACKUP_TAG_PREFIX = "backup-main-pre-rewrite-";
const BACKUP_BRANCH_PREFIX = "backup/main-pre-rewrite-";

function runGit(command, { allowFail = false } = {}) {
  try {
    return String(
      execSync(command, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }) || "",
    ).trim();
  } catch (err) {
    if (allowFail) return "";
    const stderr = String(err?.stderr || "").trim();
    throw new Error(stderr || err.message);
  }
}

function listRefs(format, pattern) {
  const raw = runGit(`git for-each-ref --format="${format}" "${pattern}"`, { allowFail: true });
  if (!raw) return [];
  return raw.split(/\r?\n/g).map((line) => line.trim()).filter(Boolean);
}

function parseRefLines(lines) {
  return lines.map((line) => {
    const [name, sha] = line.split("|");
    return { name, sha };
  });
}

function uniqueBy(arr, key) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function resolveAnchorCommit(mainSha, backupTags) {
  const candidates = backupTags
    .filter((t) => t.sha && t.sha !== mainSha)
    .sort((a, b) => a.name.localeCompare(b.name));
  return candidates.length ? candidates[0] : null;
}

function createCanonicalTag(anchor) {
  if (!anchor) return;
  runGit(`git tag ${CANONICAL_TAG} ${anchor.sha}`);
}

function pushCanonicalTag() {
  runGit(`git push origin refs/tags/${CANONICAL_TAG}`);
}

function deleteLocalBranch(branchName) {
  runGit(`git branch -D ${branchName}`);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const push = args.has("--push");
  const pruneLocalMainBackups = args.has("--prune-local-main-backups");
  if (push && !apply) {
    console.error("[backup-audit] --push requires --apply");
    process.exit(2);
  }

  const mainSha = runGit("git rev-parse refs/heads/main");
  const canonicalSha = runGit(`git rev-parse refs/tags/${CANONICAL_TAG}`, { allowFail: true });

  const backupTags = parseRefLines(
    listRefs("%(refname:short)|%(objectname)", `refs/tags/${BACKUP_TAG_PREFIX}*`),
  ).filter((t) => t.name !== CANONICAL_TAG);
  const backupBranches = parseRefLines(
    listRefs("%(refname:short)|%(objectname)", `refs/heads/${BACKUP_BRANCH_PREFIX}*`),
  );

  const nonMainBackupTagCount = backupTags.filter((t) => t.sha !== mainSha).length;
  const backupBranchesOnMain = backupBranches.filter((b) => b.sha === mainSha);
  const anchorCandidate = resolveAnchorCommit(mainSha, backupTags);

  const findings = [];
  if (!backupTags.length) findings.push("No backup pre-rewrite tag found.");
  if (!nonMainBackupTagCount) findings.push("All backup tags point to main; no real pre-rewrite anchor.");
  if (backupBranchesOnMain.length && !(apply && pruneLocalMainBackups)) {
    findings.push(
      `Backup branch points to main (${backupBranchesOnMain.map((b) => b.name).join(", ")}).`,
    );
  }
  if (canonicalSha && canonicalSha === mainSha) {
    findings.push(`${CANONICAL_TAG} points to main (unsafe as recovery anchor).`);
  }
  if (canonicalSha && anchorCandidate && canonicalSha !== anchorCandidate.sha) {
    findings.push(
      `${CANONICAL_TAG} does not match oldest non-main backup tag candidate (${anchorCandidate.name}).`,
    );
  }

  const tagSummary = uniqueBy(backupTags, (t) => `${t.name}|${t.sha}`)
    .map((t) => `${t.name}@${t.sha}`)
    .join(", ");
  const branchSummary = uniqueBy(backupBranches, (b) => `${b.name}|${b.sha}`)
    .map((b) => `${b.name}@${b.sha}`)
    .join(", ");

  console.log(`[backup-audit] main=${mainSha}`);
  console.log(`[backup-audit] backup-tags=${tagSummary || "<none>"}`);
  console.log(`[backup-audit] backup-branches=${branchSummary || "<none>"}`);
  console.log(`[backup-audit] canonical-tag=${canonicalSha ? `${CANONICAL_TAG}@${canonicalSha}` : "<missing>"}`);

  if (apply) {
    if (!anchorCandidate) {
      console.error("[backup-audit] cannot apply: no non-main backup tag candidate found.");
      process.exit(1);
    }
    if (!canonicalSha) {
      createCanonicalTag(anchorCandidate);
      console.log(
        `[backup-audit] created ${CANONICAL_TAG}@${anchorCandidate.sha} from ${anchorCandidate.name}`,
      );
    } else {
      console.log(`[backup-audit] ${CANONICAL_TAG} already exists; immutable tag left untouched.`);
    }
    if (push) {
      pushCanonicalTag();
      console.log(`[backup-audit] pushed ${CANONICAL_TAG} to origin`);
    }
    if (pruneLocalMainBackups) {
      for (const branch of backupBranchesOnMain) {
        deleteLocalBranch(branch.name);
        console.log(`[backup-audit] deleted local branch ${branch.name} (pointed to main)`);
      }
    }
  }

  if (findings.length) {
    for (const item of findings) console.error(`[backup-audit] FAIL: ${item}`);
    process.exit(1);
  }

  console.log("[backup-audit] OK: backup anchor state is safe.");
}

main();
