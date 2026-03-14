import { hrtime } from "node:process";

function nowMs(startNs) {
  const elapsedNs = hrtime.bigint() - startNs;
  return Number(elapsedNs) / 1_000_000;
}

export function startEvidenceCase(caseName) {
  const startNs = hrtime.bigint();
  const name = String(caseName || "unknown-test");
  let closed = false;

  const finish = (status, detail = "") => {
    if (closed) return;
    closed = true;
    const duration = nowMs(startNs).toFixed(2);
    const extra = detail ? ` detail=${detail}` : "";
    console.log(`[EVIDENCE] case=${name} status=${status} durationMs=${duration}${extra}`);
  };

  console.log(`[EVIDENCE] case=${name} phase=start`);

  process.once("exit", (code) => finish(code === 0 ? "ok" : "fail", `exitCode=${code}`));
  process.once("uncaughtException", (err) => {
    process.exitCode = 1;
    finish("fail", `uncaught=${String(err?.message || err)}`);
  });
  process.once("unhandledRejection", (reason) => {
    process.exitCode = 1;
    finish("fail", `unhandled=${String(reason?.message || reason)}`);
  });

  return { finish };
}
