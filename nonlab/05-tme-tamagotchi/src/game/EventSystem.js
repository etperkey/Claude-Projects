import { THERAPIES, THERAPY_ORDER } from '../data/therapyEvents.js';
import { PHASES } from '../utils/constants.js';

// Process therapy events and random occurrences

export function eventPhase(state) {
  const messages = [];

  // Update active therapies
  for (let i = state.therapy.activeTherapies.length - 1; i >= 0; i--) {
    const active = state.therapy.activeTherapies[i];
    active.ticksRemaining--;

    // Apply per-tick therapy effect
    const therapy = THERAPIES[active.id];
    if (therapy.tick) {
      const msg = therapy.tick(state);
      if (msg) messages.push(msg);
    }

    // Check if therapy expired
    if (active.ticksRemaining <= 0) {
      therapy.remove(state);
      state.therapy.completedTherapies.push(active.id);
      state.therapy.activeTherapies.splice(i, 1);
      messages.push(`${therapy.name} treatment ended.`);
    }
  }

  // Check for new therapy warnings/triggers
  if (state.tick >= PHASES.THERAPY_START) {
    for (const therapyId of THERAPY_ORDER) {
      const therapy = THERAPIES[therapyId];

      // Skip already completed or active
      if (state.therapy.completedTherapies.includes(therapyId)) continue;
      if (state.therapy.activeTherapies.some(a => a.id === therapyId)) continue;

      // Warning phase
      const warnTick = therapy.triggerTick - PHASES.THERAPY_WARN_TICKS;
      if (state.tick === warnTick) {
        state.therapy.warningTherapy = { id: therapyId, ticksUntil: PHASES.THERAPY_WARN_TICKS };
        messages.push(therapy.warningMessage);
      }

      // Update warning countdown
      if (state.therapy.warningTherapy && state.therapy.warningTherapy.id === therapyId) {
        state.therapy.warningTherapy.ticksUntil = therapy.triggerTick - state.tick;
      }

      // Trigger therapy
      if (state.tick === therapy.triggerTick) {
        therapy.apply(state);
        state.therapy.activeTherapies.push({ id: therapyId, ticksRemaining: therapy.duration });
        state.therapy.warningTherapy = null;
        messages.push(therapy.activeMessage);
      }
    }
  }

  // Random flavor events
  if (Math.random() < 0.08) {
    const event = getRandomEvent(state);
    if (event) {
      event.apply(state);
      messages.push(event.message);
    }
  }

  return messages;
}

function getRandomEvent(state) {
  const events = [
    {
      condition: () => state.immune.cells.dc > 2,
      message: 'A dendritic cell presents your antigens at a T cell conference!',
      apply: (s) => { s.immune.alertLevel = Math.min(100, s.immune.alertLevel + 5); },
    },
    {
      condition: () => state.tumor.cellCount > 1000,
      message: 'Hypoxia detected! Your inner cells are suffocating.',
      apply: (s) => {
        if (s.tumor.angiogenesis < 30) {
          const loss = Math.floor(s.tumor.cellCount * 0.03);
          s.tumor.cellCount = Math.max(1, s.tumor.cellCount - loss);
        }
      },
    },
    {
      condition: () => state.tumor.allies.m2 > 0,
      message: 'Your M2 macrophages release healing factors!',
      apply: (s) => {
        const boost = Math.floor(s.tumor.cellCount * 0.03);
        s.tumor.cellCount += boost;
      },
    },
    {
      condition: () => state.tumor.immunosuppression < 20,
      message: 'The immune system smells weakness...',
      apply: (s) => { s.immune.alertLevel = Math.min(100, s.immune.alertLevel + 3); },
    },
    {
      condition: () => state.tick > 50 && state.tumor.mutations.length === 0,
      message: 'Genomic stability is overrated. Maybe try mutating?',
      apply: () => {},
    },
    {
      condition: () => true,
      message: 'A stray neutrophil wanders through. It looks confused.',
      apply: () => {},
    },
  ];

  const eligible = events.filter(e => e.condition());
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}
