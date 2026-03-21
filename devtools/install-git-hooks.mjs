import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const hooksPath = path.join(root, ".githooks");

try {
  execSync(`git config core.hooksPath "${hooksPath}"`, {
    cwd: root,
    stdio: "inherit",
  });
  console.log(`[hooks] core.hooksPath set to ${hooksPath}`);
} catch (err) {
  console.error(`[hooks] failed to configure core.hooksPath: ${err.message}`);
  process.exit(1);
}
