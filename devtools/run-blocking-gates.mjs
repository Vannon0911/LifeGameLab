import { execSync } from "node:child_process";

const gates = Object.freeze([
  { name: "truth", cmd: ["npm", "run", "test:truth"] },
  { name: "determinism", cmd: ["npm", "run", "test:determinism:matrix"] },
  { name: "smoke-e2e", cmd: ["npm", "run", "test:smoke:e2e"] },
]);

for (const gate of gates) {
  console.log(`[blocking-gates] start ${gate.name}`);
  const command = gate.cmd.join(" ");
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    const code = Number(error?.status || 1);
    console.error(`[blocking-gates] ${gate.name} failed with exit code ${code}`);
    process.exit(code);
  }
  console.log(`[blocking-gates] pass ${gate.name}`);
}

console.log("[blocking-gates] all blocking gates passed");
