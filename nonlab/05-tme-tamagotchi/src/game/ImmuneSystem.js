import { IMMUNE, STATS } from '../utils/constants.js';

// Immune system AI — escalation, recruitment, and killing

export function immunePhase(state) {
  const messages = [];
  const { tumor, immune } = state;

  // 1. Increase alert level
  const sizeBonus = Math.floor(tumor.cellCount / 500) * IMMUNE.ALERT_PER_500_CELLS;
  immune.alertLevel = Math.min(IMMUNE.MAX_ALERT, immune.alertLevel + IMMUNE.BASE_ALERT_PER_TICK + sizeBonus);

  // 2. Recruit immune cells based on alert thresholds
  if (immune.alertLevel >= IMMUNE.CD8_THRESHOLD) {
    let rate = IMMUNE.CD8_RECRUIT_RATE;
    // Dendritic cells amplify T cell recruitment
    rate += immune.cells.dc * 0.5;
    immune.cells.cd8 += rate;
  }
  if (immune.alertLevel >= IMMUNE.NK_THRESHOLD) {
    immune.cells.nk += IMMUNE.NK_RECRUIT_RATE;
  }
  if (immune.alertLevel >= IMMUNE.M1_THRESHOLD) {
    immune.cells.m1 += IMMUNE.M1_RECRUIT_RATE;
  }
  if (immune.alertLevel >= IMMUNE.DC_THRESHOLD) {
    immune.cells.dc += IMMUNE.DC_RECRUIT_RATE;
  }

  // MDSC allies reduce infiltration
  if (tumor.allies.mdsc > 0) {
    const reduction = tumor.allies.mdsc * 1;
    immune.cells.cd8 = Math.max(0, immune.cells.cd8 - reduction * 0.3);
    immune.cells.nk = Math.max(0, immune.cells.nk - reduction * 0.2);
  }

  // 3. Immune cells attack tumor
  const suppressionFactor = 1 - (tumor.immunosuppression / 100);
  let totalKills = 0;

  // CD8+ T cells
  if (immune.cells.cd8 > 0) {
    let cd8Effectiveness = 8 * suppressionFactor;
    // PD-L1 check
    if (tumor.mutations.includes('pdl1') && !state.therapy.pdl1Disabled) {
      cd8Effectiveness *= 0.70; // 30% reduction
    }
    // β2M loss
    if (tumor.mutations.includes('b2m')) {
      cd8Effectiveness *= 0.5;
    }
    const cd8Kills = Math.floor(immune.cells.cd8 * cd8Effectiveness);
    totalKills += cd8Kills;
  }

  // NK cells — ignore MHC evasion (β2M), blocked by CD47
  if (immune.cells.nk > 0) {
    let nkEffectiveness = 6 * suppressionFactor;
    if (tumor.mutations.includes('cd47')) {
      nkEffectiveness *= 0.2; // CD47 mostly blocks NK/macrophage
    }
    const nkKills = Math.floor(immune.cells.nk * nkEffectiveness);
    totalKills += nkKills;
  }

  // M1 Macrophages — blocked by CD47
  if (immune.cells.m1 > 0) {
    let m1Effectiveness = 4 * suppressionFactor;
    if (tumor.mutations.includes('cd47')) {
      m1Effectiveness *= 0.1; // CD47 strongly blocks phagocytosis
    }
    const m1Kills = Math.floor(immune.cells.m1 * m1Effectiveness);
    totalKills += m1Kills;
  }

  // DC don't kill directly

  // Apply kills
  if (totalKills > 0) {
    tumor.cellCount = Math.max(0, tumor.cellCount - totalKills);
    if (totalKills > 10) {
      messages.push(`Immune system killed ${totalKills} cells!`);
    }
  }

  // 4. Update infiltration gauge (visual representation of immune presence)
  const totalImmune = immune.cells.cd8 + immune.cells.nk + immune.cells.m1 + immune.cells.dc;
  // Infiltration is a normalized 0-100 view
  state.tumor.infiltration = Math.min(100, totalImmune * 3);

  // 5. T cell exhaustion
  if (tumor.immunosuppression > 60) {
    immune.exhaustion += IMMUNE.EXHAUSTION_PER_TICK_SUPPRESSED;
  } else {
    immune.exhaustion = Math.max(0, immune.exhaustion - IMMUNE.EXHAUSTION_DECAY);
  }

  // Exhaustion reduces effectiveness over time
  if (immune.exhaustion > 50) {
    // T cells start dying off from exhaustion
    const exhaustionLoss = (immune.exhaustion - 50) * 0.02;
    immune.cells.cd8 = Math.max(0, immune.cells.cd8 * (1 - exhaustionLoss));
  }

  return messages;
}
