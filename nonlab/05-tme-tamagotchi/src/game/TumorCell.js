import { TUMOR, STATS, ACTIONS, CYTOKINES as CYT_CONST } from '../utils/constants.js';
import { MUTATIONS, getAvailableMutations } from '../data/mutations.js';
import { CYTOKINE_LIST, checkCytokineSynergy } from '../data/cytokines.js';
import { NOTIFICATIONS } from '../data/flavor.js';

// Tumor growth logic — called each tick
export function tumorGrowthPhase(state) {
  const t = state.tumor;
  const messages = [];

  // Base growth rate modified by angiogenesis
  let growthRate = TUMOR.BASE_GROWTH_RATE + (t.angiogenesis * TUMOR.ANGIOGENESIS_GROWTH_BONUS);

  // Apply mutation modifiers
  const effectiveMultiplier = getMutationGrowthMultiplier(t.mutations);
  growthRate *= effectiveMultiplier;

  // Grow
  const newCells = Math.max(1, Math.floor(t.cellCount * growthRate));
  t.cellCount += newCells;

  // ATP regen
  let energyRegen = TUMOR.ATP_REGEN_PER_TICK;
  if (t.mutations.includes('nfkb')) energyRegen = Math.floor(energyRegen * 1.5);
  t.energy = Math.min(t.maxEnergy, t.energy + energyRegen);

  // Cytokine regen (slow passive)
  t.cytokineStockpile = Math.min(CYT_CONST.MAX_STOCKPILE, t.cytokineStockpile + 1);

  // Decay stats
  let immunoDecay = STATS.IMMUNOSUPPRESSION_DECAY;
  if (t.mutations.includes('ezh2')) immunoDecay *= 0.5;
  t.immunosuppression = Math.max(0, t.immunosuppression - immunoDecay);

  let angioDecay = STATS.ANGIOGENESIS_DECAY;
  if (t.mutations.includes('vegf_mut')) angioDecay *= 0.5;
  t.angiogenesis = Math.max(0, t.angiogenesis - angioDecay);

  // Ally effects
  if (t.allies.m2 > 0) {
    t.immunosuppression = Math.min(100, t.immunosuppression + t.allies.m2 * 2);
  }
  if (t.allies.treg > 0) {
    t.immunosuppression = Math.min(100, t.immunosuppression + t.allies.treg * 3);
  }

  // Mutation cooldown
  if (t.mutateCooldown > 0) {
    t.mutateCooldown--;
    if (t.mutateCooldown === 0) {
      messages.push('Mutation process complete! Ready to mutate again.');
    }
  }

  return messages;
}

// Player actions
export function actionFeed(state, cytokineId = null) {
  const t = state.tumor;
  if (t.energy < ACTIONS.FEED_COST) {
    return { success: false, message: NOTIFICATIONS.lowEnergy };
  }

  t.energy -= ACTIONS.FEED_COST;

  let cytokine;
  if (cytokineId) {
    cytokine = CYTOKINE_LIST.find(c => c.id === cytokineId);
  } else {
    // Random cytokine
    cytokine = CYTOKINE_LIST[Math.floor(Math.random() * CYTOKINE_LIST.length)];
  }

  const effectMsg = cytokine.effect(state);
  t.cytokineStockpile = Math.min(CYT_CONST.MAX_STOCKPILE, t.cytokineStockpile + 2);

  // Track for synergy
  t.recentCytokines.push(cytokine.id);
  if (t.recentCytokines.length > 3) t.recentCytokines.shift();

  // Check synergy
  const synergy = checkCytokineSynergy(t.recentCytokines);
  let message = NOTIFICATIONS.feedSuccess(cytokine.name) + ' ' + effectMsg;
  if (synergy) {
    t.immunosuppression = Math.min(100, t.immunosuppression + synergy.amount);
    message += ' ' + synergy.message;
  }

  return { success: true, message, cytokine: cytokine.id };
}

export function actionMutate(state) {
  const t = state.tumor;
  if (t.energy < ACTIONS.MUTATE_COST) {
    return { success: false, message: NOTIFICATIONS.lowEnergy };
  }
  if (t.mutateCooldown > 0) {
    return { success: false, message: NOTIFICATIONS.mutateCooldown(t.mutateCooldown) };
  }

  const maxSlots = t.maxMutationSlots + (t.mutations.includes('tp53') ? 2 : 0);
  if (t.mutations.length >= maxSlots) {
    return { success: false, message: 'No mutation slots available!' };
  }

  t.energy -= ACTIONS.MUTATE_COST;
  t.mutateCooldown = ACTIONS.MUTATE_COOLDOWN;

  // Fail chance
  if (Math.random() < ACTIONS.MUTATE_FAIL_CHANCE) {
    const loss = Math.floor(t.cellCount * ACTIONS.MUTATE_FAIL_CELL_LOSS);
    t.cellCount = Math.max(1, t.cellCount - loss);
    return { success: false, message: NOTIFICATIONS.mutateFail + ` Lost ${loss} cells!` };
  }

  // Pick a random available mutation
  const available = getAvailableMutations(t.mutations);
  if (available.length === 0) {
    return { success: false, message: 'No mutations available!' };
  }

  // Weight by tier — lower tier more likely early
  const mutation = weightedMutationPick(available, state.tick);
  t.mutations.push(mutation.id);
  applyMutationEffect(t, mutation);

  return { success: true, message: NOTIFICATIONS.mutateSuccess(mutation.name), mutation };
}

function weightedMutationPick(available, tick) {
  // Early game favors tier 1, late game favors higher tiers
  const weights = available.map(m => {
    if (tick < 30) return m.tier <= 2 ? 3 : 1;
    if (tick < 80) return m.tier <= 3 ? 2 : 1;
    return 1; // equal chance late
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    r -= weights[i];
    if (r <= 0) return available[i];
  }
  return available[available.length - 1];
}

function applyMutationEffect(tumor, mutation) {
  const e = mutation.effect;
  if (e.apoptosisResistanceBonus) {
    tumor.apoptosisResistance = Math.min(100, tumor.apoptosisResistance + e.apoptosisResistanceBonus);
  }
  if (e.extraMutationSlots) {
    tumor.maxMutationSlots += e.extraMutationSlots;
  }
  // Other effects are checked dynamically during game ticks
}

export function actionRecruit(state) {
  const t = state.tumor;
  if (t.cytokineStockpile < ACTIONS.RECRUIT_CYTOKINE_COST) {
    return { success: false, message: NOTIFICATIONS.recruitFail };
  }

  t.cytokineStockpile -= ACTIONS.RECRUIT_CYTOKINE_COST;

  // Random ally type
  const allyTypes = ['m2', 'treg', 'mdsc'];
  const type = allyTypes[Math.floor(Math.random() * allyTypes.length)];
  t.allies[type] = (t.allies[type] || 0) + 1;

  const names = { m2: 'M2 Macrophage', treg: 'Regulatory T Cell', mdsc: 'MDSC' };
  return { success: true, message: NOTIFICATIONS.recruitSuccess(names[type]), allyType: type };
}

export function actionRest(state) {
  const t = state.tumor;
  t.energy = Math.min(t.maxEnergy, t.energy + TUMOR.REST_ATP_GAIN);
  // Quiescent cells upregulate anti-apoptotic pathways
  t.apoptosisResistance = Math.min(STATS.MAX_APOPTOSIS_RESISTANCE, t.apoptosisResistance + TUMOR.REST_APOPTOSIS_GAIN);
  return { success: true, message: NOTIFICATIONS.restMessage + ` (+${TUMOR.REST_ATP_GAIN} ATP, +${TUMOR.REST_APOPTOSIS_GAIN} apoptosis resistance)`, isRest: true };
}

// Drop a mutation (costs energy, loses some cells from genomic instability)
export function actionDropMutation(state, mutationId) {
  const t = state.tumor;
  const idx = t.mutations.indexOf(mutationId);
  if (idx === -1) return { success: false, message: 'Mutation not found!' };

  // Cost: 20 energy + 15% cell loss (genomic instability from removing an established mutation)
  const DROP_ENERGY_COST = 20;
  const DROP_CELL_LOSS = 0.15;

  if (t.energy < DROP_ENERGY_COST) {
    return { success: false, message: `Not enough ATP! Need ${DROP_ENERGY_COST}.` };
  }

  t.energy -= DROP_ENERGY_COST;
  const cellLoss = Math.floor(t.cellCount * DROP_CELL_LOSS);
  t.cellCount = Math.max(1, t.cellCount - cellLoss);

  // Remove mutation and reverse permanent effects
  t.mutations.splice(idx, 1);
  removeMutationEffect(t, mutationId);

  const mut = MUTATIONS.find(m => m.id === mutationId);
  const name = mut ? mut.name : mutationId;

  return { success: true, message: `Dropped ${name}! Lost ${cellLoss} cells to genomic instability.` };
}

function removeMutationEffect(tumor, mutationId) {
  // Reverse permanent effects
  if (mutationId === 'bcl2') {
    tumor.apoptosisResistance = Math.max(0, tumor.apoptosisResistance - 50);
  } else if (mutationId === 'double_hit') {
    tumor.apoptosisResistance = Math.max(0, tumor.apoptosisResistance - 30);
  } else if (mutationId === 'tp53') {
    tumor.maxMutationSlots -= 2;
    // If now over max, don't force-remove mutations — just block new ones
  }
}

// Helpers
function getMutationGrowthMultiplier(mutations) {
  if (mutations.includes('double_hit')) return 3.0;
  if (mutations.includes('myc')) return 2.0;
  return 1.0;
}
