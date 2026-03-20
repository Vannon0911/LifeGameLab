// ============================================================
// Circle Menu — Radial Tool Selector (Desktop Only)
// Appears on mouse-hold (300ms) ONLY if mouse stays within
// a movement threshold. Prevents accidental activation while painting.
// ============================================================

const TWO_PI = Math.PI * 2;
const MENU_RADIUS = 80;
const ITEM_RADIUS = 28;
const HOLD_DELAY_MS = 300;
const MOVEMENT_THRESHOLD_PX = 5; // max mouse movement during hold

/**
 * Create a circle menu controller.
 * @param {HTMLElement} container - parent element to attach menu DOM
 * @param {object} options
 * @param {Function} options.onSelect - callback(toolMode) when a tool is picked
 */
export function createCircleMenu(container, options) {
  const onSelect = typeof options?.onSelect === "function" ? options.onSelect : () => {};
  let menuEl = null;
  let items = [];
  let visible = false;
  let holdTimer = null;
  let activeIndex = -1;
  let origin = { x: 0, y: 0 };
  let holdOrigin = { x: 0, y: 0 };
  let holdToolList = null;
  let holdCancelled = false;

  function buildMenuDOM(toolList) {
    if (menuEl) menuEl.remove();
    menuEl = document.createElement("div");
    menuEl.className = "nx-circle-menu";
    menuEl.style.cssText = [
      "position:fixed",
      "z-index:999",
      "pointer-events:none",
      "display:none",
    ].join(";");

    items = toolList.map((tool, i) => {
      const angle = (TWO_PI * i) / toolList.length - Math.PI / 2;
      const x = Math.cos(angle) * MENU_RADIUS;
      const y = Math.sin(angle) * MENU_RADIUS;

      const el = document.createElement("div");
      el.className = "nx-circle-menu-item";
      el.dataset.mode = tool.mode;
      el.textContent = tool.label;
      el.style.cssText = [
        "position:absolute",
        `left:${x - ITEM_RADIUS}px`,
        `top:${y - ITEM_RADIUS}px`,
        `width:${ITEM_RADIUS * 2}px`,
        `height:${ITEM_RADIUS * 2}px`,
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "border-radius:50%",
        `border:2px solid ${tool.accent || "rgba(255,255,255,0.3)"}`,
        "background:rgba(10,16,24,0.92)",
        "backdrop-filter:blur(8px)",
        "color:#eaf2ff",
        "font:700 0.68rem/1 ui-sans-serif, system-ui, sans-serif",
        "text-align:center",
        "letter-spacing:0.02em",
        "pointer-events:auto",
        "cursor:pointer",
        "transition:transform 0.12s, background 0.12s, border-color 0.12s",
        "box-shadow:0 4px 16px rgba(0,0,0,0.35)",
      ].join(";");
      menuEl.appendChild(el);
      return { el, tool, angle, x, y };
    });

    // Center dot
    const center = document.createElement("div");
    center.style.cssText = [
      "position:absolute",
      "left:-6px",
      "top:-6px",
      "width:12px",
      "height:12px",
      "border-radius:50%",
      "background:rgba(124,194,255,0.6)",
      "border:1px solid rgba(124,194,255,0.9)",
      "pointer-events:none",
    ].join(";");
    menuEl.appendChild(center);

    container.appendChild(menuEl);
  }

  function show(clientX, clientY, toolList) {
    if (!toolList || !toolList.length) return;
    origin = { x: clientX, y: clientY };
    buildMenuDOM(toolList);
    menuEl.style.left = `${clientX}px`;
    menuEl.style.top = `${clientY}px`;
    menuEl.style.display = "block";
    visible = true;
    activeIndex = -1;
    updateHighlight(-1);
  }

  function hide() {
    if (menuEl) menuEl.style.display = "none";
    visible = false;
    activeIndex = -1;
    cancelHold();
  }

  function updateHighlight(idx) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const isActive = i === idx;
      it.el.style.transform = isActive ? "scale(1.18)" : "scale(1)";
      it.el.style.background = isActive
        ? `${it.tool.accent || "rgba(124,194,255,0.3)"}44`
        : "rgba(10,16,24,0.92)";
      it.el.style.borderColor = isActive
        ? (it.tool.accent || "rgba(124,194,255,0.9)")
        : "rgba(255,255,255,0.2)";
    }
  }

  function findClosestItem(clientX, clientY) {
    if (!items.length) return -1;
    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 20) return -1;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < items.length; i++) {
      const ix = items[i].x;
      const iy = items[i].y;
      const d = Math.sqrt((dx - ix) * (dx - ix) + (dy - iy) * (dy - iy));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return bestDist < ITEM_RADIUS * 2.5 ? best : -1;
  }

  function onMouseMove(e) {
    // During hold wait: cancel if mouse moves beyond threshold
    if (holdTimer !== null && !holdCancelled) {
      const dx = e.clientX - holdOrigin.x;
      const dy = e.clientY - holdOrigin.y;
      if (Math.sqrt(dx * dx + dy * dy) > MOVEMENT_THRESHOLD_PX) {
        holdCancelled = true;
        cancelHold();
      }
    }
    // During visible menu: highlight closest item
    if (!visible) return;
    const idx = findClosestItem(e.clientX, e.clientY);
    if (idx !== activeIndex) {
      activeIndex = idx;
      updateHighlight(idx);
    }
  }

  function onMouseUp() {
    if (!visible) {
      cancelHold();
      return;
    }
    if (activeIndex >= 0 && activeIndex < items.length) {
      onSelect(items[activeIndex].tool.mode);
    }
    hide();
  }

  /**
   * Start a hold-to-show timer.
   * Only fires if mouse stays within MOVEMENT_THRESHOLD_PX during the wait.
   * @param {number} clientX
   * @param {number} clientY
   * @param {Array} toolList - array of { mode, label, accent }
   */
  function startHold(clientX, clientY, toolList) {
    cancelHold();
    holdOrigin = { x: clientX, y: clientY };
    holdToolList = toolList;
    holdCancelled = false;
    holdTimer = setTimeout(() => {
      holdTimer = null;
      if (!holdCancelled) {
        show(clientX, clientY, toolList);
      }
    }, HOLD_DELAY_MS);
  }

  function cancelHold() {
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    holdToolList = null;
    holdCancelled = false;
  }

  // Attach global listeners for tracking
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  return {
    show,
    hide,
    startHold,
    cancelHold,
    isVisible() { return visible; },
    destroy() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (menuEl) menuEl.remove();
      cancelHold();
    },
  };
}
