import { TRAIT_DEFAULT } from "./life.data.js";
import { TRAITS } from "./constants.js";
import { clamp } from "./shared.js";
import { DOCTRINE_BY_ID } from "../techTree.js";

export const traitAt = {
  h: (tr, i) => Number(tr[i * TRAITS + 0]) || TRAIT_DEFAULT[0],
  u: (tr, i) => Number(tr[i * TRAITS + 1]) || TRAIT_DEFAULT[1],
  ts: (tr, i) => Number(tr[i * TRAITS + 2]) || TRAIT_DEFAULT[2],
  tb: (tr, i) => Number(tr[i * TRAITS + 3]) || TRAIT_DEFAULT[3],
  cb: (tr, i) => Number(tr[i * TRAITS + 4]) || TRAIT_DEFAULT[4],
};

export function buildLineageRuntime(mem) {
  const doctrine = DOCTRINE_BY_ID[String(mem?.doctrine || "equilibrium")] || DOCTRINE_BY_ID.equilibrium;
  const techs = new Set(Array.isArray(mem?.techs) ? mem.techs.map(String) : []);
  const synergies = new Set(Array.isArray(mem?.synergies) ? mem.synergies.map(String) : []);

  let energyMul = Number(doctrine.effects?.energyIn || 1);
  let upkeepMul = Number(doctrine.effects?.upkeep || 1);
  let birthMul = Number(doctrine.effects?.birth || 1);
  let survivalBonus = Number(doctrine.effects?.survival || 0);
  let linkMul = Number(doctrine.effects?.link || 1);
  let toxinMul = Number(doctrine.effects?.toxin || 1);

  if (techs.has("light_harvest")) energyMul *= 1.10;
  if (techs.has("nutrient_harvest")) energyMul *= 1.06;
  if (techs.has("toxin_resist")) toxinMul *= 1.12;
  if (techs.has("reserve_buffer")) upkeepMul *= 0.93;
  if (techs.has("cooperative_network")) linkMul *= 1.16;
  if (techs.has("reproductive_spread")) birthMul *= 1.20;
  if (techs.has("defensive_shell")) survivalBonus += 0.05;
  if (techs.has("nomadic_adapt")) energyMul *= 1.04;
  if (techs.has("hybrid_mixer")) energyMul *= 1.04;
  if (techs.has("fortress_homeostasis")) upkeepMul *= 0.94;
  if (techs.has("scavenger_loop")) toxinMul *= 1.10;
  if (techs.has("symbiotic_bloom")) birthMul *= 1.08;
  if (techs.has("mutation_diversify")) survivalBonus += 0.02;

  if (synergies.has("photon_mesh")) {
    energyMul *= 1.05;
    linkMul *= 1.08;
  }
  if (synergies.has("split_bloom")) birthMul *= 1.14;
  if (synergies.has("fortress_grid")) survivalBonus += 0.05;
  if (synergies.has("toxin_recycling")) toxinMul *= 1.12;
  if (synergies.has("bloom_protocol")) {
    energyMul *= 1.05;
    birthMul *= 1.08;
  }

  return { energyMul, upkeepMul, birthMul, survivalBonus, linkMul, toxinMul, techs, synergies };
}

export function clampScarcityByNutrient(value) {
  return clamp(0.5 - clamp(value, 0, 1), 0, 0.5) * 2;
}
