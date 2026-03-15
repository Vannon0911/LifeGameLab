import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-render-worker-fallback.mjs");

import fs from "node:fs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const mainSource = fs.readFileSync(new URL("../src/app/main.js", import.meta.url), "utf8");
const workerSource = fs.readFileSync(new URL("../src/game/render/render.worker.js", import.meta.url), "utf8");

assert(mainSource.includes("summarizeWorldView(state)"), "RenderManager signature must summarize world view state");
assert(mainSource.includes("world.visibility"), "RenderManager signature must include visibility");
assert(mainSource.includes("world.explored"), "RenderManager signature must include explored");
assert(mainSource.includes("world.infraCandidateMask"), "RenderManager signature must include infra candidate mask");
assert(mainSource.includes("this.worker.onerror"), "RenderManager must register worker.onerror fallback");
assert(mainSource.includes('this.flush("worker_render_error")'), "RenderManager must flush on worker render error");
assert(mainSource.includes('this.replaceCanvas("main")'), "RenderManager must replace canvas on worker fallback");
assert(workerSource.includes('cmd: "RENDER_ERROR"'), "render worker must emit RENDER_ERROR");

console.log("RENDER_WORKER_FALLBACK_OK worker render invalidation and fallback hooks are wired");
