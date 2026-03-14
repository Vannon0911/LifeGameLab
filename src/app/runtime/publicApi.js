import { renderLlmReadModelAsText } from "../../project/llm/readModel.js";

export function registerPublicApi({
  windowObj,
  store,
  benchmark,
  runOneSimStep,
  runRender,
  runUiSync,
  publishPerfStats,
  perfBudget,
}) {
  function renderGameToText() {
    return renderLlmReadModelAsText(
      store.getState(),
      typeof benchmark?.getSnapshot === "function" ? benchmark.getSnapshot() : null
    );
  }

  async function advanceTime(ms = 1000) {
    const duration = Math.max(0, Number(ms) || 0);
    const speed = Math.max(1, Number(store.getState().meta.speed || 1));
    const steps = Math.max(1, Math.round((duration / 1000) * speed));
    for (let i = 0; i < steps; i++) {
      runOneSimStep({ force: true, useBuffer: false });
    }
    runRender({
      quality: perfBudget.quality,
      dprCap: perfBudget.dprCap,
      fps: perfBudget.fpsEma,
      frameMs: perfBudget.frameMsEma,
      renderMs: perfBudget.renderMsEma,
      targetMinFps: perfBudget.targetMinFps,
      targetMaxFps: perfBudget.targetMaxFps,
    });
    runUiSync();
    publishPerfStats();
    return { steps, tick: Number(store.getState().sim.tick || 0) };
  }

  windowObj.render_game_to_text = renderGameToText;
  windowObj.advanceTime = advanceTime;
  return { renderGameToText, advanceTime };
}
