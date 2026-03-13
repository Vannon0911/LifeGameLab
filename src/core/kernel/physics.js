// ============================================================
// Physics — All tunable constants in one place
// Edit here to change simulation behaviour globally
// ============================================================

export const PHYSICS_DEFAULT = {
  // Light
  L_mean:          0.22,   // average ambient light
  L_diffusion:     0.02,   // how far light spreads per tick

  // Cell survival
  T_survive:       0.06,   // min light to survive
  T_birth:         0.10,   // min light to birth
  U_base:          0.05,   // base energy upkeep per tick
  Emax:            3.2,    // max energy a cell can hold

  // Reproduction
  C_birth_base:    0.45,   // energy cost to birth a child
  S_seed_base:     0.30,   // energy seeded to newborn

  // Nutrients (R) and Waste (W)
  R_gen:           0.014,
  R_decay:         0.004,
  R_diff:          0.02,
  R_uptake:        0.07,
  R_yieldE:        0.16,
  W_gen:           0.008,
  W_decay:         0.010,
  W_diff:          0.02,
  W_penaltySurvive:0.024,
  W_penaltyBirth:  0.010,

  // Network / links
  linkBuild:       0.10,
  linkDecay:       0.02,
  linkCost:        0.02,
  transferStrength:0.08,

  // Cost model
  costNetwork:     0.03,
  costActivity:    0.03,
  costScarcity:    0.05,

  // Plants
  plantCloudDensity: 0.82,
  B_decay:          0.045,
  B_diff:           0.04,
  B_to_plant_gain:  0.30,

  // Cluster remote warfare
  remoteAttackCost:     0.12,
  remoteAttackFalloff:  0.72,
  remoteAttackCooldown: 36,
  defenseAdaptRate:     0.04,

  // Evolution
  evoRuntimeStrength: 0.035,
  evoHueAdapt:        0.055,

  // Season
  seasonAmp:    0.10,
  seasonPeriod: 520,
};
