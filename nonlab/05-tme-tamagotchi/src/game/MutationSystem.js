import { MUTATIONS } from '../data/mutations.js';

// Get display info for acquired mutations
export function getMutationDisplay(mutationIds) {
  return mutationIds.map(id => {
    const mut = MUTATIONS.find(m => m.id === id);
    return mut ? { id: mut.id, name: mut.name, flavorText: mut.flavorText } : null;
  }).filter(Boolean);
}

// Check if a specific mutation effect is active
export function hasMutation(state, mutationId) {
  return state.tumor.mutations.includes(mutationId);
}

// Get total mutation slots available
export function getMutationSlots(state) {
  let slots = state.tumor.maxMutationSlots;
  if (state.tumor.mutations.includes('tp53')) slots += 2;
  return slots;
}

// Get summary of active mutation effects for display
export function getMutationEffectsSummary(state) {
  const effects = [];
  const muts = state.tumor.mutations;

  if (muts.includes('pdl1') && !state.therapy.pdl1Disabled) effects.push('PD-L1: T cells -30%');
  if (muts.includes('bcl2')) effects.push('BCL2: Apoptosis resist');
  if (muts.includes('double_hit')) effects.push('DOUBLE HIT: 3x growth');
  else if (muts.includes('myc')) effects.push('MYC: 2x growth');
  if (muts.includes('cd47')) effects.push('CD47: Anti-phagocytosis');
  if (muts.includes('tp53')) effects.push('TP53 loss: +2 slots');
  if (muts.includes('nfkb')) effects.push('NF-κB: +50% energy');
  if (muts.includes('vegf_mut')) effects.push('VEGF: Angio decay halved');
  if (muts.includes('b2m')) effects.push('β2M loss: CD8 -50%');
  if (muts.includes('ezh2')) effects.push('EZH2: Suppression sticky');

  return effects;
}
