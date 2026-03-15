import { PLAYER_DOCTRINES, DOCTRINE_BY_ID, deriveCommandScore } from "../techTree.js";
import { getInfluencePhase, getPlayerMemory } from "./ui.model.js";
import { el, fmt } from "./ui.dom.js";

export function renderEingriffePanel({ container, state, sim, actionDefs, actions }) {
  const playerMemory = getPlayerMemory(state);
  const playerStage = Number(sim.playerStage || 1);
  const commandScore = deriveCommandScore(sim);
  const influencePhase = getInfluencePhase(playerStage, commandScore, sim.runPhase);
  const currentDoctrine = DOCTRINE_BY_ID[String(playerMemory?.doctrine || "equilibrium")] || PLAYER_DOCTRINES[0];

  const activeCard = el("section", "nx-card");
  activeCard.appendChild(el("div", "nx-card-title", "Handlungsraum"));
  activeCard.appendChild(el("div", "nx-note", `Phase ${influencePhase}. ${currentDoctrine.label} bleibt Dauerhaltung, die Eingriffe loesen Prozesse statt Einzelklicks aus.`));
  activeCard.appendChild(el("div", "nx-note", `Fortschritt ${fmt(Number(sim.stageProgressScore || 0), 3)} · Stabilitaet ${fmt(Number(sim.stabilityScore || 0), 3)} · Oekologie ${fmt(Number(sim.ecologyScore || 0), 3)}`));
  container.appendChild(activeCard);

  const doctrineCard = el("section", "nx-card");
  doctrineCard.appendChild(el("div", "nx-card-title", "Prioritaet"));
  const doctrineGrid = el("div", "nx-doctrine-grid");
  for (const doctrine of PLAYER_DOCTRINES) {
    const locked = playerStage < Number(doctrine.unlockStage || 1);
    const active = doctrine.id === currentDoctrine.id;
    const card = el("button", `nx-doctrine-card${active ? " is-active" : ""}${locked ? " is-locked" : ""}`);
    card.disabled = locked;
    card.append(
      el("span", "nx-doctrine-name", doctrine.label),
      el("span", "nx-doctrine-stage", `ab S${doctrine.unlockStage}`),
      el("span", "nx-doctrine-copy", doctrine.summary),
    );
    card.addEventListener("click", () => actions.setDoctrine(doctrine));
    doctrineGrid.appendChild(card);
  }
  doctrineCard.appendChild(doctrineGrid);
  container.appendChild(doctrineCard);

  const actionCard = el("section", "nx-card");
  actionCard.appendChild(el("div", "nx-card-title", "Main-Run-Eingriffe"));
  for (const action of actionDefs) {
    const box = el("div", "nx-zone-row");
    const left = el("div", "");
    left.appendChild(el("div", "nx-zone-name", action.label));
    left.appendChild(el("div", "nx-zone-desc", action.what));
    box.appendChild(left);
    const btn = el("button", "nx-btn nx-btn-ghost", action.label);
    btn.addEventListener("click", () => actions.runMainAction(action));
    box.appendChild(btn);
    actionCard.appendChild(box);
    actionCard.appendChild(el("div", "nx-note", `Ertrag: ${action.gain} Risiko: ${action.risk} Kontext: ${action.where}`));
  }
  container.appendChild(actionCard);
}
