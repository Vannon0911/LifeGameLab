import { STATUS_GROUPS } from "./ui.constants.js";

function getNestedValue(state, key) {
  if (!state) return 0;
  if (state.sim && state.sim[key] !== undefined) return state.sim[key];
  if (state.meta && state.meta[key] !== undefined) return state.meta[key];
  if (state.world && state.world[key] !== undefined) return state.world[key];
  return 0;
}

export function renderStats(state, container) {
  if (!container || !state) return;

  let html = "";
  for (const group of STATUS_GROUPS) {
    const [title, items] = group;
    // Optional: We can prefix the group with a subtle title if needed, e.g. `<span style="color:#4a5568; margin-right: 0.5rem">${title.toUpperCase()}</span>`
    // but a clean list of items is more compact for a top bar.
    html += `<div class="hub-group">`;
    for (const item of items) {
      const [label, key, decimals] = item;
      const rawVal = getNestedValue(state, key);
      const displayVal = Number.isFinite(Number(rawVal)) 
        ? Number(rawVal).toFixed(decimals) 
        : "0".padEnd(decimals + (decimals > 0 ? 1 : 0), ".0");
      
      html += `<div class="stat-item">
        <span class="stat-label">${label}</span>
        <span class="stat-val">${displayVal}</span>
      </div>`;
    }
    html += `</div>`;
  }

  // Fast DOM update
  if (container.innerHTML !== html) {
    container.innerHTML = html;
  }
}
